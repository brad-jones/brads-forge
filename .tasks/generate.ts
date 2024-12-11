import * as yaml from "@std/yaml";
import * as fs from "lib/fs.ts";
import * as path from "@std/path";
import { Recipe } from "lib/models/recipe.ts";
import { outdent } from "@cspotcode/outdent";
import * as esbuild from "esbuild";
import { denoPlugins } from "@luca/esbuild-deno-loader";

const forgeDir = fs.toPathString(import.meta.resolve("../forge"));
console.log(`Looking for recipes in ${forgeDir}`);

const newRecipes = [];

for await (const item of fs.walk(forgeDir, { match: [/\/recipe.ts$/] })) {
  // Build the rattler-build recipe object
  console.log(`Importing ${item.path}`);
  const r = (await import(item.path))["default"];
  if (!(r instanceof Recipe)) throw new Error(`unexpected recipe export`);
  const recipe = await r.toObject();

  // Create new versioned recipe directory
  const recipeDir = path.join(
    path.dirname(item.path),
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
      entryPoints: [item.path],
      outfile: recipeJsFile,
      format: "esm",
      minify: true,
      bundle: true,
      plugins: [...denoPlugins({ configPath })],
    });
    console.log(`Written ${recipeJsFile}`);
  }

  newRecipes.push({
    name: r.props.name,
    version: recipe.package.version,
    buildNo: recipe.build?.number ?? 0,
    about: recipe.about,
  });
}

const prBodyTxtFile = path.join(fs.toPathString(import.meta.resolve("../output")), "pr-body.md");
await Deno.writeTextFile(
  prBodyTxtFile,
  outdent`
    ${
    newRecipes.map((r) =>
      outdent`
          ## ${r.name}: ${r.version}-${r.buildNo}

          \`\`\`json
          ${r.about ? JSON.stringify(r.about, null, "  ") : JSON.stringify({ missing: "about metadata" }, null, "  ")}
          \`\`\`
        `
    ).join("\n\n")
  }
  `,
);
console.log(`Written ${prBodyTxtFile}`);
