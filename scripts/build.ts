#!/usr/bin/env -S deno run -qA --ext=ts
import { Command, EnumType } from "@cliffy/command";
import { outdent } from "@cspotcode/outdent";
import { $ } from "@david/dax";
import { load } from "@std/dotenv";
import * as yaml from "@std/yaml";
import * as fs from "lib/fs.ts";
import { path } from "lib/mod.ts";
import { currentPlatform, Platform } from "lib/models/platform.ts";
import { Recipe, RecipeExecCtx } from "lib/models/recipe.ts";
import { PrefixClient } from "lib/prefix_client/mod.ts";

await load({ envPath: `${import.meta.dirname}/../.env`, export: true });

const recipeModules: Record<string, Recipe> = {};

// Absolute, forward-slash path to the repo's deno.json, used so `deno run` can resolve the `lib/`
// import map & jsr/npm bare specifiers even when its CWD is rattler-build's isolated work dir.
const denoConfigPath = fs.toPathString(import.meta.resolve("../deno.json")).replaceAll("\\", "/");

type PackageKind = "arch" | "noarch" | "all";
const packageKindType = new EnumType<PackageKind>(["arch", "noarch", "all"]);

/**
 * Thrown when a recipe cannot be published by this run & no other run will publish it
 * either, so carrying on would drop the package from the channel without saying so.
 */
class UnpublishableError extends Error {}

interface BuildOptions {
  prefix: PrefixClient;
  recipePath: string;
  targetPlatform: Platform;
  channel: string;
  upload: boolean;
  build: boolean;
  forgeDir: string;
}

/** Imports & caches a recipe module, so repeated builds of it do not re-import. */
async function loadRecipe(recipePath: string): Promise<Recipe> {
  if (!recipeModules[recipePath]) {
    const v = (await import(path.toFileUrl(recipePath).toString()))["default"];
    if (!(v instanceof Recipe)) throw new Error(`unexpected recipe export: ${recipePath}`);
    recipeModules[recipePath] = v;
  }
  return recipeModules[recipePath];
}

/**
 * Narrows the requested target platforms down to those a recipe actually needs building for.
 *
 * A noarch package is a single artifact for every platform it supports, so building it more
 * than once only ever produces the same file again. Which platform does the building is
 * likewise irrelevant, so callers that just want the artifact - `publish-noarch` - do not
 * have to name one. The build still has to happen somewhere though, so prefer the platform
 * we are running on & fall back to the first requested one the recipe supports.
 */
async function resolveTargetPlatforms(recipePath: string, requested: Platform[]): Promise<Platform[]> {
  try {
    const r = await loadRecipe(recipePath);
    if (!r.props.build.noarch) return requested;
    const supported = await r.getPlatforms();
    const buildable = requested.filter((_) => supported.includes(_));
    // Nothing buildable, hand back a single platform so `buildRecipe` reports the lack of
    // platform support once instead of once per requested platform.
    if (buildable.length === 0) return requested.slice(0, 1);
    return [buildable.includes(currentPlatform) ? currentPlatform : buildable[0]];
  } catch (_) {
    // Leave it to `buildRecipe` to surface & report the failure, as it always has.
    return requested;
  }
}

/**
 * Whether this run owns the recipe, ie: whether it belongs to the pipeline that asked for
 * `packageKind`. A noarch package only needs publishing once but is still built & tested on
 * every platform it supports, so it runs through its own CI pipeline, and each pipeline
 * needs to leave the other's recipes alone.
 *
 * Deliberately reads nothing but `build.noarch`, which is free once the module is imported.
 * The platform checks in `buildRecipe` need `getPlatforms()`, and for a recipe whose
 * platforms are inferred from its sources that downloads & hashes every release asset -
 * doing that for a recipe this run is going to skip anyway is pure waste.
 */
async function ownsRecipe(recipePath: string, packageKind: PackageKind): Promise<boolean> {
  if (packageKind === "all") return true;
  try {
    const r = await loadRecipe(recipePath);
    const recipeKind: PackageKind = r.props.build.noarch ? "noarch" : "arch";
    if (recipeKind === packageKind) return true;
    console.log(`Skipping ${r.props.name}, only building ${packageKind} recipes`);
    return false;
  } catch (_) {
    // Leave it to `buildRecipe` to surface & report the failure, as it always has.
    return true;
  }
}

async function buildRecipe(
  { prefix, recipePath, targetPlatform, channel, build, upload }: BuildOptions,
) {
  // Can not upload if we are not building
  upload = build ? upload : false;

  const r = await loadRecipe(recipePath);
  const packagePlatform: Platform | "noarch" = r.props.build.noarch ? "noarch" : targetPlatform;

  // Select the latest version number
  const lastestVersion = async () => {
    const v = await r.getVersion();
    return v.semver ?? v.raw;
  };

  // Bail out if the recipe does not support the platform
  const recipePlatforms = await r.getPlatforms();
  if (!recipePlatforms.includes(targetPlatform)) {
    // A noarch recipe is collapsed to a single build (see `resolveTargetPlatforms`), so when
    // that one platform is unsupported there is no second run left to publish it. Skipping
    // would drop the package from the channel silently, so fail the publish instead.
    if (upload && packagePlatform === "noarch") {
      throw new UnpublishableError(
        `${r.props.name} is noarch but does not support ${targetPlatform}, which is where the ` +
          `publish runs. A noarch package is only built once, so nothing else will publish it - ` +
          `add ${targetPlatform} to its \`platforms\`, or publish from one of ` +
          `${recipePlatforms.join(", ")}`,
      );
    }
    console.log(`Skipping, recipe does not support: ${targetPlatform}`);
    const ghaSummary = Deno.env.get("GITHUB_STEP_SUMMARY");
    if (ghaSummary) {
      await Deno.writeTextFile(
        ghaSummary,
        `- :no_entry: \`${targetPlatform}/${r.props.name}\`: **skipped** _(no platform support)_\n`,
        { append: true },
      );
    }
    return;
  }

  // Bail out if the recipe has already been published to prefix.dev
  // Unless the user is skipping the upload, at that point we assume
  // they want to build for test purposes.
  const variant = {
    name: r.props.name,
    version: await lastestVersion(),
    buildNo: r.props.build.number ?? 0,
    platform: packagePlatform,
    channel,
  };
  const variantString = `${variant.platform}/${variant.name}-${variant.version}-${variant.buildNo}`;
  if (upload && await prefix.variantExists(variant)) {
    console.log(`Skipping, variant already published: ${variantString}`);
    const ghaSummary = Deno.env.get("GITHUB_STEP_SUMMARY");
    if (ghaSummary) {
      await Deno.writeTextFile(
        ghaSummary,
        `- :ok_hand: \`${variantString}\`: **skipped** _(already published)_\n`,
        { append: true },
      );
    }
    return;
  }

  // Create new versioned recipe directory to stage our generated artifacts
  const recipeDir = path.join(
    path.dirname(recipePath),
    `generated/${targetPlatform}/${variant.version}-${variant.buildNo}`,
  );
  await fs.emptyDir(recipeDir);
  console.log(`Created ${recipeDir}`);

  // Build the context needed to execute this recipe.ts directly (unbundled) from within
  // rattler-build's isolated build/test environment.
  let execCtx: RecipeExecCtx | undefined;
  if (r.hasJsFuncs) {
    const denoDir = Deno.env.get("DENO_DIR");
    if (!denoDir) {
      throw new Error(
        "DENO_DIR is not set - required to pin the isolated rattler-build env's Deno module cache",
      );
    }
    execCtx = {
      recipeTsPath: recipePath.replaceAll("\\", "/"),
      denoConfigPath,
      denoDir: denoDir.replaceAll("\\", "/"),
    };
  }

  // Write the rattler-build yaml file
  const recipeYamlPath = path.join(recipeDir, "recipe.yaml");
  await Deno.writeTextFile(
    recipeYamlPath,
    outdent`
        # yaml-language-server: $schema=https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json
        ${yaml.stringify(await r.toObject(targetPlatform, execCtx))}
      `,
  );
  console.log(`Written ${recipeYamlPath}`);

  if (build) {
    await $`rattler-build build -r ${recipeYamlPath} --target-platform ${targetPlatform} --test native --no-include-recipe -c https://prefix.dev/${channel} -c conda-forge`;
  }

  if (upload) {
    const artifact = await fs.expandGlobFirst(
      path.join(
        "output",
        packagePlatform,
        `${variant.name}-${variant.version}-*_${variant.buildNo}.conda`,
      ),
    );
    if (artifact) {
      await $`rattler-build upload prefix -c ${channel} ${artifact}`;
      const ghaSummary = Deno.env.get("GITHUB_STEP_SUMMARY");
      if (ghaSummary) {
        await Deno.writeTextFile(
          ghaSummary,
          `- :rocket: \`${packagePlatform}/${path.basename(artifact)}\`: **published**\n`,
          { append: true },
        );
      }
    }
  }
}

await new Command()
  .name("build")
  .description("Builds all recipes")
  .type("packageKind", packageKindType)
  .option("-r, --recipe-path <recipePath:string>", "Specfic recipe to build")
  .option("--package-kind <packageKind:packageKind>", "Kind of recipes to build.", {
    default: "all" as PackageKind,
  })
  .option("--channel <channel:string>", "Channel name", {
    default: "brads-forge",
  })
  .option("--forge-dir <forgeDir:string>", "Directory to find recipes in.", {
    default: fs.toPathString(import.meta.resolve("../forge")),
  })
  .option("--target-platforms [platform...:string]", "Platforms to build for.", {
    default: [currentPlatform],
  })
  .option("--no-build", "Skip the rattler-build, just generate the YAML recipe.")
  .option("--no-upload", "Skip upload to prefix.dev, just do the build locally.")
  .action(async ({ recipePath, forgeDir, targetPlatforms, channel, upload, build, packageKind }) => {
    const prefix = new PrefixClient();
    const platforms = (targetPlatforms as string[]).map((p) => Platform.parse(p));
    if (recipePath) {
      recipePath = await Deno.realPath(recipePath);
      if (await ownsRecipe(recipePath, packageKind)) {
        for (const targetPlatform of await resolveTargetPlatforms(recipePath, platforms)) {
          await buildRecipe({ prefix, channel, build, upload, recipePath, targetPlatform, forgeDir });
        }
      }
    } else {
      const unpublishable: string[] = [];

      // Recipes may live at any depth under `forge/`, eg: `<domain>/<owner>/<repo>/recipe.ts` or
      // `<domain>/<owner>/<repo>/<pkg>/recipe.ts` when one upstream repo produces several packages.
      // `generated` is skipped because it only ever contains our own build artifacts.
      for await (
        const item of fs.walk(forgeDir, {
          match: [Deno.build.os === "windows" ? /\\recipe.ts$/ : /\/recipe.ts$/],
          skip: [/[\\/]generated([\\/]|$)/],
        })
      ) {
        const recipePath = item.path;
        if (!await ownsRecipe(recipePath, packageKind)) continue;
        for (const targetPlatform of await resolveTargetPlatforms(recipePath, platforms)) {
          console.log(
            `::group::${
              path.dirname(recipePath).replaceAll("\\", "/")
                .replace(`${forgeDir.replaceAll("\\", "/")}/`, "")
            }-${targetPlatform}`,
          );
          try {
            await buildRecipe({
              prefix,
              channel,
              build,
              upload,
              recipePath,
              targetPlatform,
              forgeDir,
            });
          } catch (e) {
            if (e instanceof UnpublishableError) {
              // Keep walking so the rest of the recipes still publish, but remember it -
              // a `::error` annotation alone leaves the job green.
              unpublishable.push(`${recipePath}: ${e.message}`);
              console.log(`::error title=${recipePath}::${e.message}`);
            } else {
              console.log(`::error title=${recipePath}::recipe failed to cook`);
              console.warn(e);
            }
          }
          console.log(`::endgroup::`);
        }
      }

      if (unpublishable.length > 0) {
        throw new Error(
          `${unpublishable.length} recipe(s) can never be published:\n${unpublishable.join("\n")}`,
        );
      }
    }
  })
  .parse(Deno.args);
