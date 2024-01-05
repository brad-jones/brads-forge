import "https://deno.land/std@0.210.0/dotenv/load.ts";
import * as fs from "https://deno.land/std@0.210.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.210.0/path/mod.ts";
import * as semver from "https://deno.land/std@0.210.0/semver/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.19.11/mod.js";
import { __dirname, bakeRecipe, goDefer, parsePlatform } from "lib/mod.ts";

await new Command()
  .name("forge")
  .description("A pixi / rattler-build conda package publisher.")
  .option(
    "-f, --forge-dir <dir:string>",
    "The root directory of where to find recipes to build.",
    {
      default: `./${
        path.relative(
          Deno.cwd(),
          path.join(__dirname(import.meta), "forge"),
        )
      }`,
    },
  )
  .option(
    "-r, --recipe-dir <dir:string>",
    "A root directory of a specific recipe to build.",
    { collect: true },
  )
  .option(
    "--version <version:string>",
    "A version to include in the forging process..",
    {
      collect: true,
    },
  )
  .option(
    "--platform <platform:string>",
    "A target platform to include in the forging process.",
    {
      collect: true,
    },
  )
  .option(
    "--exclude-platform <platform:string>",
    "A target platform to exclude from the forging process.",
    {
      collect: true,
    },
  )
  .option(
    "--publish",
    "Set this to enable uploading of the built conda packages to pixi.dev",
  )
  .action((
    { forgeDir, recipeDir, version, platform, excludePlatform, publish },
  ) =>
    goDefer(async (defer) => {
      defer(() => esbuild.stop());

      const versions = version
        ? version.map((_) => semver.parse(_))
        : undefined;

      const platforms = platform
        ? platform.map((_) => parsePlatform(_))
        : undefined;

      const excludePlatforms = excludePlatform
        ? excludePlatform.map((_) => parsePlatform(_))
        : undefined;

      if (recipeDir) {
        for (const dir of recipeDir) {
          await bakeRecipe(dir, versions, platforms, excludePlatforms, publish);
        }
        return;
      }

      for await (const dirEntry of fs.walk(forgeDir, { exts: ["ts"] })) {
        await bakeRecipe(
          path.dirname(dirEntry.path),
          versions,
          platforms,
          excludePlatforms,
          publish,
        );
      }
    })
  )
  .parse();

// LINUX "catchall" GHA RUNNER: pixi run forge --exclude-platform osx-64 --exclude-platform osx-arm64 --exclude-platform win-64 --exclude-platform win-arm64
// MACOS GHA RUNNER: pixi run forge --platform osx-64 osx-arm64
// WINDOWS GHA RUNNER: pixi run forge --platform win-64 win-arm64
