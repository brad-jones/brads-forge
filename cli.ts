import { Bakery } from "lib/bakery/mod.ts";
import { __dirname } from "lib/fs/mod.ts";
import "https://deno.land/std@0.211.0/dotenv/load.ts#^";
import * as radash from "https://esm.sh/radash@11.0.0#^";
import * as fs from "https://deno.land/std@0.211.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.211.0/path/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js#^";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts#^";
const { defer } = radash;

// Define a default path to the forge directory
const fPath = `./${
  path.relative(
    Deno.cwd(),
    path.join(__dirname(import.meta), "forge"),
  )
}`;

await new Command()
  .name("forge")
  .description("A pixi / rattler-build conda package publisher.")
  .option("-f, --forge-dir <dir:string>", "The root directory of where to find recipes to build.", { default: fPath })
  .option("-r, --recipe-dir <dir:string>", "A root directory of a specific recipe to build.", { collect: true })
  .option("-v, --version <version:string>", "A version to include in the forging process..", { collect: true })
  .option("-p, --platform <platform:string>", "A target platform to include in the forging process.", { collect: true })
  .option("-o, --output-dir <path:string>", "A path to save built conda packages to")
  .option("--publish", "Set this to enable uploading of the built conda packages to pixi.dev")
  .option("--exclude-platform <platform...:string>", "A target platform to exclude from the forging process.")
  .action(({ forgeDir, recipeDir, version, platform, excludePlatform, outputDir, publish }) =>
    defer(async (defer) => {
      defer(() => esbuild.stop());

      const b = new Bakery({ version, platform, excludePlatform, outputDir, publish });

      if (recipeDir) {
        for (const dir of recipeDir) {
          await b.bakeRecipe(dir);
        }
        return;
      }

      for await (const dirEntry of fs.walk(forgeDir, { exts: ["ts"] })) {
        await b.bakeRecipe(path.dirname(dirEntry.path));
      }
    })
  )
  .parse();
