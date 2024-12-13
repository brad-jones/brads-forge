import * as yaml from "@std/yaml";
import * as fs from "lib/fs.ts";
import { load } from "@std/dotenv";
import * as path from "@std/path";
import { Recipe } from "lib/models/recipe.ts";
import { outdent } from "@cspotcode/outdent";
import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

await load({ envPath: `${import.meta.dirname}/../.env`, export: true });

const forgeDir = fs.toPathString(import.meta.resolve("../forge"));
console.log(`Looking for recipes in ${forgeDir}`);

for await (const item of fs.walk(forgeDir, { match: [/\/recipe.ts$/] })) {
  const friendlyPath = item.path.replace(forgeDir, "");

  // Import the recipe module
  console.log(`\n>>> Running ${friendlyPath}`);
  const r = (await import(item.path))["default"];
  if (!(r instanceof Recipe)) throw new Error(`unexpected recipe export`);

  // Check if it is published, bail out if so
  //if (await r.isFullyPublished()) {
  //  console.log(`Skipping recipe, already up to date.`);
  //  continue;
  //}

  // Create directory for generated recipe
  const recipe = await r.toObject();
  const fullVersion = `${recipe.package.version}-${recipe.build?.number ?? 0}`;
  const recipeDir = path.join(path.dirname(item.path), fullVersion)
    .replace(forgeDir, path.join(path.dirname(forgeDir), "generated-forge"));
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
      entryPoints: [item.path],
      outfile: recipeJsFile,
      format: "esm",
      minify: true,
      bundle: true,
      plugins: [...denoPlugins({ configPath })],
    });
    console.log(`Written ${recipeJsFile}`);
  }
}
