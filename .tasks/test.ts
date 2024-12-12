import { load } from "@std/dotenv";
import ky from "ky";
import { Command } from "@cliffy/command";
import { $ } from "@david/dax";
import * as yaml from "@std/yaml";
import * as fs from "lib/fs.ts";
import * as path from "@std/path";
import { commonPlatforms, Recipe } from "lib/mod.ts";
import { outdent } from "@cspotcode/outdent";
import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

await load({ envPath: `${import.meta.dirname}/../.env`, export: true });

await new Command()
  .name("local-test")
  .description("Tests a local package from start to finish")
  .option("-r, --recipe-path <recipePath:string>", "TypeScript recipe path", { required: true })
  .action(async ({ recipePath }) => {
    // Build the rattler-build recipe object
    console.log(`Importing ${recipePath}`);
    const r = (await import(path.join("..", recipePath)))["default"];
    if (!(r instanceof Recipe)) throw new Error(`unexpected recipe export`);
    const recipe = await r.toObject();

    // Create new versioned recipe directory
    const recipeDir = path.join(
      path.dirname(recipePath),
      `${recipe.package.version}-${recipe.build?.number ?? 0}`,
    );
    await fs.emptyDir(recipeDir);
    console.log(`Created ${recipeDir}`);

    // Write the rattler-build yaml file
    const recipeYamlPath = path.join(recipeDir, "recipe.yaml");
    await Deno.writeTextFile(
      recipeYamlPath,
      outdent`
        # yaml-language-server: $schema=https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json
        ${yaml.stringify(recipe)}
      `,
    );
    console.log(`Written ${recipeYamlPath}`);

    // Write the Javascript
    if (r.hasJsFuncs) {
      const configPath = import.meta.resolve("../deno.json").replace("file://", "");
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

    for (const platform of [...commonPlatforms, "win-32"]) {
      console.log(
        `\n>>> Building ${platform}\n--------------------------------------------------------------------------------`,
      );
      await $`rattler-build build -r ${recipeYamlPath} --test=native --target-platform ${platform}`;
    }
  })
  .parse(Deno.args);
