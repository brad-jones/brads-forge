import * as radash from "https://esm.sh/radash@11.0.0#^";
import * as fs from "https://deno.land/std@0.211.0/fs/mod.ts#^";
import * as path from "https://deno.land/std@0.211.0/path/mod.ts#^";
import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";
import * as esbuild from "https://deno.land/x/esbuild@v0.19.2/mod.js#^";
import { denoPlugins } from "https://deno.land/x/esbuild_deno_loader@0.8.2/mod.ts";
import { expandGlobFirst } from "lib/fs/mod.ts";
import { Recipe, makeDslCtx } from "lib/models/mod.ts";
import { PrefixClient } from "lib/prefix/prefix_client.ts";
import { currentPlatform, parsePlatform, Platform, currentOs } from "lib/models/platform.ts";
const { defer } = radash;

export class Bakery {
  #versions: semver.SemVer[];
  #platforms: Platform[];
  #excludePlatforms: Platform[];
  #outputDir?: string;
  #publish: boolean;
  #prefixClient: PrefixClient;
  #debugMode: boolean;

  #log = (str: string) => Deno.stdout.writeSync(new TextEncoder().encode(str));
  #logGha = (str: string) => Deno.env.get("GITHUB_ACTIONS") ? this.#log(str) : {};

  constructor(
    { version, platform, excludePlatform, outputDir, publish, prefixClient, debugMode }: {
      version?: string[];
      platform?: string[];
      excludePlatform?: string[];
      outputDir?: string;
      publish?: boolean;
      prefixClient?: PrefixClient;
      debugMode?: boolean;
    } = {},
  ) {
    this.#versions = version ? version.map((_) => semver.parse(_)) : [];
    this.#platforms = platform ? platform.map((_) => parsePlatform(_)) : [];
    this.#excludePlatforms = excludePlatform ? excludePlatform.map((_) => parsePlatform(_)) : [];
    this.#outputDir = outputDir;
    this.#publish = publish ?? false;
    this.#prefixClient = prefixClient ?? new PrefixClient();
    this.#debugMode = debugMode ?? Deno.env.get("BAKERY_DEBUG") ? true : false;
  }

  public async bakeRecipe(rDir: string) {
    // Dynamically import the recipe module
    this.#log(`reading recipe: ${rDir}\n`);
    const modPath = path.toFileUrl(path.resolve(rDir, "recipe.ts"));
    const mod = await import(modPath.toString());
    const r = mod.default as Recipe;

    // Resolve which versions we are going to bake
    let versions = this.#versions;
    if (versions.length === 0) {
      this.#log(`getting last 2 versions... `);
      versions = semver.sort(await r.props.versions()).reverse().slice(0, 2);
      this.#log(`${JSON.stringify(versions.map((v) => semver.format(v)))}\n`);
    }

    // Resolve which platforms we are going to bake
    let platforms = this.#platforms;
    if (platforms.length > 0) {
      platforms = platforms.filter((p) => r.props.platforms.includes(p));
    } else {
      platforms = r.props.platforms;
    }
    platforms = platforms.filter((_) => !(this.#excludePlatforms ?? []).includes(_));

    for (const v of versions) {
      for (const p of platforms) {
        try {
          await this.#bakeVariant(r, rDir, v, p);
        } catch (e) {
          if (this.#debugMode) throw e;
          console.error(e);
          console.log("continuing with remaining variants");
        }
      }
    }
  }

  #bakeVariant = (r: Recipe, rDir: string, v: semver.SemVer, p: Platform) =>
    defer(async (defer) => {
      // Create the variant id
      const n = r.props.name;
      const vID = `${n}/${p}@${semver.format(v)}`;

      // This makes nice little accordions when run on gha
      this.#logGha(`::group::{${vID}}\n`);
      defer(() => this.#logGha(`::endgroup::\n`));

      // Check to see if the variant already exists, if so bail out early.
      if (this.#publish) {
        this.#log(`searching for ${vID}... `);
        if (await this.#prefixClient.variantExists({ n, p, v })) {
          this.#log(`variant already published\n`);
          return;
        }
        this.#log(`not found\n`);
      }

      // Here we are just getting a URL & a digest thats appropriate for the
      // version & platform that we are about to get rattler-build to build
      // for us. Rattler does the actual downloading of the sources.
      this.#log(`resolving recipe sources... `);
      const s = await r.props.sources(makeDslCtx(v, p));
      this.#log(`done\n`);

      // Create our own temporary staging directory where we can do all our
      // work & then have it cleaned up at the end. However it is sometimes
      // useful to inspects this directory when debugging a recipe so when
      // debugMode is true we will let it exist.
      this.#log(`creating tmp recipe staging dir... `);
      const tmpStagingDir = await Deno.makeTempDir({ prefix: `brads-forge-${n}` });
      defer(() => !this.#debugMode ? Deno.remove(tmpStagingDir, { recursive: true }) : {});
      this.#log(`${tmpStagingDir}\n`);

      // Next we copy all files that exist in the source recipe directory to the staging directory
      this.#log(`copying recipe to tmp recipe staging dir... `);
      const tmpRecipeDir = path.join(tmpStagingDir, "src");
      fs.copy(rDir, tmpRecipeDir, { overwrite: true });
      this.#log(`done\n`);

      // Transpile & bundle the recipe.ts file into recipe.js
      // We do this so that the conda package can be reproducible.
      // At least on platforms where deno is supported anyway.
      this.#log(`bundling recipe.ts... `);
      let configPath = import.meta.resolve("../../deno.json").replace("file://", "");
      if (currentOs === "win") configPath = configPath.substring(1).replaceAll("/", "\\");
      await esbuild.build({
        entryPoints: [path.join(rDir, "recipe.ts")],
        outfile: path.join(tmpRecipeDir, "recipe.js"),
        format: "esm",
        bundle: true,
        platform: "neutral",
        target: "deno1",
        plugins: [...denoPlugins({ configPath })],
      });
      this.#log(`done\n`);

      // Take our custom typescript based recipe format & serialize it into
      // a yaml file that rattler-build understands.
      this.#log(`writing recipe.yaml... `);
      const rrp = path.resolve(tmpRecipeDir, "recipe.yaml");
      const rr = r.rattlerRecipe({ v, p, s });
      if (this.#debugMode) console.log(rr.mappedRecipe);
      await Deno.writeTextFile(rrp, rr.toYaml());
      this.#log(`done\n`);

      // Build the conda package
      const pkgPath = await this.#executeRattler(r, tmpStagingDir, p);

      // If the output dir is set, copy the package to it
      if (this.#outputDir) {
        const dstDir = path.resolve(this.#outputDir, p);
        const dst = path.join(dstDir, path.basename(pkgPath));
        await fs.ensureDir(dstDir);
        await fs.copy(pkgPath, dst, { overwrite: true });
        this.#log(`Written: ${dst}\n`);
      }

      // Finally publish the package to prefix.dev
      if (this.#publish) {
        this.#log(`Publishing ${vID}... \n`);
        await this.#prefixClient.pkgUpload(pkgPath);
        this.#log(`Successfully published ${path.basename(pkgPath)}\n\n`);
      }
    });

  async #executeRattler(r: Recipe, rDir: string, p: Platform) {
    const outputDir = path.resolve(rDir, "output");

    // dprint-ignore
    const args = ["build",
      "-r", path.join(rDir, "src", "recipe.yaml"),
      "--target-platform", p,
      "--output-dir", outputDir
    ];

    // There is no point in executing the tests on a platform that can not run them.
    // ie: In the case of cors compilation the final binary can not be executed by the build system.
    // Or if a test function has been given & the platform is not supported by deno.
    const hasTestFunc = typeof r.props.test?.script === "function";
    const supportedByDeno = ["linux-64", "win-64", "osx-64", "osx-arm64"].includes(currentPlatform);
    if (p !== currentPlatform || (hasTestFunc && !supportedByDeno)) args.push("--no-test");

    // Finally execute rattler which if all goes well will spit out a conda package
    const cmd = new Deno.Command("rattler-build", { args, stdout: "inherit", stderr: "inherit" });
    const { code } = await cmd.output();
    if (code !== 0) throw new Error(`rattler-build failed`);

    // Return the path to the package
    const pkgPath = await this.#findCondaPkg(outputDir, p);
    if (!pkgPath) throw new Error("conda package not found");
    return pkgPath;
  }

  #findCondaPkg = async (outputDir: string, platform: Platform) =>
    (await expandGlobFirst(path.join(outputDir, platform, "*.{tar.bz2,conda}")))?.path;
}
