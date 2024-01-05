import * as fs from "https://deno.land/std@0.211.0/fs/mod.ts#^";
import * as path from "https://deno.land/std@0.211.0/path/mod.ts#^";
import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";
import * as esbuild from "https://deno.land/x/esbuild@v0.19.11/mod.js#^";
import {
  _,
  __dirname,
  pkgExists,
  pkgUpload,
  Platform,
  radash,
  RattlerRecipe,
  Recipe,
  splitPlatform,
} from "lib/mod.ts";
const { defer } = radash;

const log = (str: string) =>
  Deno.stdout.writeSync(new TextEncoder().encode(str));

const logGha = (str: string) =>
  Deno.env.get("GITHUB_ACTIONS")
    ? Deno.stdout.writeSync(new TextEncoder().encode(str))
    : {};

export async function bakeRecipe(
  recipeDir: string,
  versions?: semver.SemVer[],
  platforms?: Platform[],
  excludePlatforms?: Platform[],
  publish?: boolean,
) {
  log(`reading recipe: ${recipeDir}\n`);
  const mod = await import(
    path.toFileUrl(path.resolve(recipeDir, "recipe.ts")).toString()
  );
  const recipe = mod.default as Recipe;

  if (!versions) {
    log(`getting last 5 versions... `);
    versions = semver.sort(await recipe.props.versions()).reverse().slice(0, 5);
    log(`${JSON.stringify(versions.map((v) => semver.format(v)))}\n`);
  }

  if (!platforms) platforms = recipe.props.platforms;
  platforms = platforms.filter((_) => !(excludePlatforms ?? []).includes(_));

  for (const version of versions) {
    for (const platform of platforms) {
      await bakeVariant(recipe, version, platform, recipeDir, publish ?? false);
    }
  }
}

const bakeVariant = (
  recipe: Recipe,
  version: semver.SemVer,
  platform: Platform,
  recipeDir: string,
  publish: boolean,
) =>
  defer(async (defer) => {
    const { name } = recipe.props;
    const [os, arch] = splitPlatform(platform);
    const variant = `${name}/${platform}@${semver.format(version)}`;

    logGha(`::group::{${variant}}\n`);
    defer(() => logGha(`::endgroup::\n`));

    log(`searching for ${variant}... `);
    if (await pkgExists(recipe.props.name, version, platform)) {
      log(`variant already published\n`);
      return;
    }
    log(`not found\n`);

    log(`resolving recipe sources... `);
    const sources = await recipe.props.sources(version, os, arch);
    log(`done\n`);

    log(`creating tmp recipe staging dir... `);
    const tmpStagingDir = await Deno.makeTempDir({
      prefix: `brads-forge-${recipe.props.name}`,
    });
    defer(() => Deno.remove(tmpStagingDir, { recursive: true }));
    log(`${tmpStagingDir}\n`);

    log(`copying recipe to tmp recipe staging dir... `);
    const tmpRecipeDir = path.join(tmpStagingDir, "src");
    fs.copy(recipeDir, tmpRecipeDir, { overwrite: true });
    log(`done\n`);

    log(`bundling recipe.ts... `);
    await esbuild.build({
      entryPoints: [path.join(recipeDir, "recipe.ts")],
      outfile: path.join(tmpRecipeDir, "recipe.js"),
      format: "esm",
      bundle: true,
      platform: "neutral",
      target: "deno1",
      alias: {
        "lib/mod.ts": import.meta.resolve("./mod.ts").replace("file://", ""),
      },
    });
    log(`done\n`);

    log(`writing recipe.yaml... `);
    const rattlerRecipePath = path.resolve(tmpRecipeDir, "recipe.yaml");
    const rattlerRecipe = new RattlerRecipe(recipe, version, platform, sources);
    await Deno.writeTextFile(rattlerRecipePath, rattlerRecipe.toYaml());
    log(`done\n`);

    const outputDir = path.resolve(tmpStagingDir, "output");

    const cmd = new Deno.Command("rattler-build", {
      // dprint-ignore
      args: [
        "build", "-r", rattlerRecipePath,
        "--target-platform", platform,
        "--output-dir", outputDir,
      ],
      stdout: "inherit",
      stderr: "inherit",
    });
    const { code } = await cmd.output();
    if (code !== 0) {
      throw new Error(`rattler-build failed`);
    }

    if (publish) {
      log(`Publishing ${variant}... \n`);
      const pkgPath = await findCondaPkg(outputDir, platform);
      await pkgUpload(pkgPath);
      log(`Successfully published ${path.basename(pkgPath)}\n\n`);
    }
  });

async function findCondaPkg(outputDir: string, platform: Platform) {
  let filePath = "";
  for await (
    const entry of fs.expandGlob(
      path.join(outputDir, platform, "*.{tar.bz2,conda}"),
    )
  ) {
    if (filePath === "") {
      filePath = entry.path;
    }
  }
  return filePath;
}
