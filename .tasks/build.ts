import { load } from "@std/dotenv";
import { Command } from "@cliffy/command";
import * as fs from "lib/fs.ts";
import * as yaml from "@std/yaml";
import { PrefixClient } from "lib/prefix_client/mod.ts";
import { Platform, currentPlatform } from "lib/models/platform.ts";
import { Recipe } from "lib/models/recipe.ts";
import { path } from "lib/mod.ts";
import { outdent } from "@cspotcode/outdent";
import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";
import { $ } from "@david/dax";

await load({ envPath: fs.toPathString(import.meta.resolve("../.env")), export: true });

await new Command()
  .name("build")
  .description("Builds all recipes")
  .option("-r, --recipe-path <recipePath:string>", "Specfic recipe to build")
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
  .action(async ({ recipePath, forgeDir, targetPlatforms, channel, upload, build }) => {
    const prefix = new PrefixClient();
    const platforms = (targetPlatforms as string[]).map((p) => Platform.parse(p));
    if (recipePath) {
      recipePath = await Deno.realPath(recipePath);
      await buildRecipe({ prefix, channel, build, upload, recipePath, platforms, forgeDir });
    } else {
      for await (const item of fs.walk(forgeDir, { match: [/\/recipe.ts$/] })) {
        const recipePath = item.path;
        try {
          await buildRecipe({ prefix, channel, build, upload, recipePath, platforms, forgeDir });
        } catch (e) {
          console.log(`::error title=${recipePath}::recipe failed to cook`);
          console.warn(e);
        }
      }
    }
  })
  .parse(Deno.args);

interface BuildOptions {
  prefix: PrefixClient;
  recipePath: string;
  platforms: Platform[];
  channel: string;
  upload: boolean;
  build: boolean;
  forgeDir: string;
}

async function buildRecipe({ prefix, recipePath, platforms, channel, build, upload, forgeDir }: BuildOptions) {
  // Can not upload if we are not building
  upload = build ? upload : false;

  // Import the recipe module
  const r = (await import(recipePath))["default"];
  if (!(r instanceof Recipe)) throw new Error(`unexpected recipe export`);

  const lastestVersion = async () => {
    const v = await r.getVersion();
    return v.semver ?? v.raw;
  };

  // Loop through each platform that we need to build
  const recipePlatforms = await r.getPlatforms();
  for (const platform of platforms) {
    console.log(
      `::group::${path.dirname(recipePath).replace(`${forgeDir}/`, "")}-${platform}-${await lastestVersion()}`,
    );
    try {
      // Bail out if the recipe does not support the platform
      if (!recipePlatforms.includes(platform)) {
        console.log(`Skipping, recipe does not support: ${platform}`);
        continue;
      }

      // Bail out if the recipe has already been published to prefix.dev
      // Unless the user is skipping the upload, at that point we assume
      // they want to build for test purposes.
      const variant = {
        name: r.props.name,
        version: await lastestVersion(),
        buildNo: r.props.build.number ?? 0,
        platform,
        channel,
      };
      const variantString = `${variant.name}-${variant.version}-${variant.buildNo}-${variant.platform}`;
      if (upload && await prefix.variantExists(variant)) {
        console.log(`Skipping, variant already published: ${variantString}`);
        continue;
      }

      // Create new versioned recipe directory to stage our generated artifacts
      const recipeDir = path.join(
        path.dirname(recipePath),
        `generated/${platform}/${variant.version}-${variant.buildNo}`,
      );
      await fs.emptyDir(recipeDir);
      console.log(`Created ${recipeDir}`);

      // Write the rattler-build yaml file
      const recipeYamlPath = path.join(recipeDir, "recipe.yaml");
      await Deno.writeTextFile(
        recipeYamlPath,
        outdent`
        # yaml-language-server: $schema=https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json
        ${yaml.stringify(await r.toObject(platform))}
      `,
      );
      console.log(`Written ${recipeYamlPath}`);

      // Write the Javascript
      if (r.hasJsFuncs) {
        const configPath = fs.toPathString(import.meta.resolve("../deno.json"));
        const recipeJsFile = path.join(recipeDir, "bundled-recipe.ts");
        await esbuild.build({
          entryPoints: [recipePath],
          outfile: recipeJsFile,
          format: "esm",
          minify: true,
          bundle: true,
          plugins: [...denoPlugins({ configPath })],
        });
        console.log(`Written ${recipeJsFile}`);
      }

      if (build) {
        await $`rattler-build build
        -r ${recipeYamlPath} --target-platform ${platform} --test native
        -c conda-forge -c https://prefix.dev/${channel}
      `;
      }

      if (upload) {
        const artifact = await fs.expandGlobFirst(
          path.join(
            "output",
            platform,
            `${variant.name}-${variant.version}-*_${variant.buildNo}.conda`,
          ),
        );
        if (artifact) {
          await $`rattler-build upload prefix -c ${channel} ${artifact}`;
        }
      }
    } finally {
      console.log(`::endgroup::`);
    }
  }
}
