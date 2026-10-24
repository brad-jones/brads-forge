// deno-lint-ignore-file no-explicit-any
import { Command } from "@cliffy/command";
import * as path from "@std/path";
import { Ajv, AnySchema, Plugin, ValidateFunction } from "ajv";
import ajvFormats, { FormatsPluginOptions } from "ajv-formats";
import ky from "ky";
import { z } from "zod";
import { BuildContext } from "./build.ts";
import { Platform, PlatformArch, PlatformOs } from "./platform.ts";
import { SimpleRecipe } from "./rattler/simple_recipe.ts";
import { PlatformSources, RecipeProps, Sources } from "./recipe_props.ts";
import { RequirementsContext } from "./requirements_context.ts";

// see: https://github.com/ajv-validator/ajv-formats/issues/85
const addFormats = ajvFormats as unknown as Plugin<FormatsPluginOptions>;

// see: https://rattler.build/latest/reference/recipe_file/#spec-reference
const JSON_SCHEMA_URL = "https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json";

const isPlatformMapped = (sources: Sources): sources is PlatformSources =>
  !Array.isArray(sources) && !("git" in sources || "url" in sources || "path" in sources);

/**
 * Context required to map a recipe that has a `build.func` and/or `tests.func` into a rattler-build
 * script. Rather than bundling the recipe (and all of its `lib/` & jsr/npm dependencies) into a
 * standalone JS file, we now execute the original `recipe.ts` file directly via `deno run`, so
 * rattler-build's isolated build/test environment needs to know exactly where to find it.
 */
export interface RecipeExecCtx {
  /** Absolute, forward-slash path to the original (non-generated) `recipe.ts` file. */
  recipeTsPath: string;
  /** Absolute, forward-slash path to the repo's `deno.json`, used to resolve import maps (`lib/`, `@cliffy/command`, etc). */
  denoConfigPath: string;
  /** Absolute, forward-slash path to a warm Deno module cache (`DENO_DIR`) to reuse, so the isolated build/test env does not need network access to re-resolve jsr:/npm: deps. */
  denoDir: string;
}

export class Recipe {
  /**
   * Parsed & Validated Recipe Properties
   */
  readonly props: z.output<typeof RecipeProps>;
  readonly #props: z.input<typeof RecipeProps>;

  /**
   * If true, it means this recipe contains javascript functions for the build &/or test scripts,
   * which require additional work to serialise into something rattler-build can execute.
   *
   * If false, this this recipe can simply be printed to YAML without any further action.
   */
  get hasJsFuncs(): boolean {
    if (this.#props.build.func) return true;
    if (this.#props.tests && "func" in this.#props.tests) return true;
    return false;
  }

  constructor(props: z.input<typeof RecipeProps>) {
    this.props = RecipeProps.parse(props);
    this.#props = props;

    // Make this class executable
    // This is how we allow rattler to run our build funcs
    if (Deno.args.length > 0 && Deno.args[0] === "execute") {
      this.#executeCmd();
    }
  }

  #executeCmd = async () =>
    await new Command()
      .name(`recipe-${this.props.name}`)
      .description("Deno rattler recipe runner")
      .option("--build", "If set the build script will be executed.")
      .option("--test", "If set the test script will be executed.")
      .option("--build-platform <buildPlatform>", "The platform `{os}-{arch}` that is running the current build.", {
        required: true,
      })
      .option(
        "--target-platform <targetPlatform>",
        "The platform `{os}-{arch}` that is being targeted by the current build.",
        { required: true },
      )
      .option(
        "--pkg-version-raw <pkgVersionRaw>",
        "The untouched version of the package as returned by the upstream version source without any semver treatmeant.",
        { required: true },
      )
      .option("--variant <variant>", "The build variant being built, if the target platform has more than one.")
      .action(async ({ build, test, buildPlatform, targetPlatform, pkgVersionRaw, variant }) => {
        const buildParts = buildPlatform.split("-");
        const buildOs = buildParts[0];
        const buildArch = buildParts[1];

        // rattler-build reports `target_platform` as `noarch` for a noarch package, which is not
        // an `{os}-{arch}` pair & so cannot be split into one. The script still runs on a
        // concrete machine though, and for a noarch package that machine is the only platform
        // that means anything to it, so fall back to the platform doing the building.
        const target = targetPlatform === "noarch" ? buildPlatform : targetPlatform;
        const targetParts = target.split("-");
        const targetOs = targetParts[0];
        const targetArch = targetParts[1];

        const unix = targetOs !== "win";
        const exe = (v: string) => targetOs === "win" ? `${v}.exe` : v;

        const buildCtx = BuildContext.parse({
          exe,
          unix,
          buildPlatform,
          buildOs,
          buildArch,
          targetPlatform: target,
          targetOs,
          targetArch,
          pkgVersionRaw,
          variant,
        });

        if (build) {
          if (this.props.build && "func" in this.props.build && this.props.build.func) {
            await this.props.build.func(buildCtx);
          } else {
            throw new Error(`missing build func`);
          }
        }

        if (test) {
          if (this.props.tests && "func" in this.props.tests && this.props.tests.func) {
            await this.props.tests.func(buildCtx);
          } else {
            throw new Error(`missing test func`);
          }
        }

        Deno.exit(0);
      })
      .parse(Deno.args.slice(1));

  #cachedVersion?: { raw: string; semver?: string | undefined };

  /**
   * Returns & caches the latest version number of the recipe.
   * Calling this many times will produce the same output
   * & not result in additional network calls.
   */
  async getVersion(): Promise<{ raw: string; semver?: string | undefined }> {
    if (!this.#cachedVersion) {
      this.#cachedVersion = await this.props.version();
    }
    return this.#cachedVersion;
  }

  #cachedSources?: Sources;

  /**
   * Returns & caches the latest sources fo the recipe.
   * Calling this many times will produce the same output
   * & not result in additional network calls.
   */
  async getSources() {
    if (!this.#cachedSources) {
      const version = await this.getVersion();
      this.#cachedSources = await this.props.sources(version.raw, version.semver);
    }
    return this.#cachedSources;
  }

  /**
   * Returns a list of platforms that this recipe supports.
   *
   * If platforms have been explicitly defined by the recipe we just return those.
   * Otherwise platforms can be infered from the sources object.
   *
   * But if sources also does not contain platform information this will
   * return an empty array, which should interpretted as all platforms.
   */
  async getPlatforms(): Promise<Platform[]> {
    if (this.props.platforms) return this.props.platforms;
    const sources = await this.getSources();
    if (isPlatformMapped(sources)) {
      return Object.keys(sources) as Platform[];
    } else {
      return [];
    }
  }

  /**
   * Returns the names of the build variants that the given platform is built as.
   *
   * An empty array means the platform is built once, without a variant.
   */
  async getVariants(targetPlatform: Platform): Promise<string[]> {
    const declared = Object.entries(this.props.variants ?? {});
    if (declared.length === 0) return [];

    const sources = await this.getSources();
    const platformSources = isPlatformMapped(sources) ? sources[targetPlatform] : undefined;
    const keyed = platformSources && !Array.isArray(platformSources) ? Object.keys(platformSources) : undefined;

    const variants = declared
      .filter(([name, { platforms }]) => {
        if (platforms) return platforms.includes(targetPlatform);
        if (keyed) return keyed.includes(name);
        return !isPlatformMapped(sources);
      })
      .map(([name]) => name);

    if (keyed && (keyed.length !== variants.length || keyed.some((_) => !variants.includes(_)))) {
      throw new Error(
        `the sources for ${targetPlatform} are keyed by [${keyed.join(", ")}] but it is built as ` +
          `the variants [${variants.join(", ")}]`,
      );
    }

    return variants;
  }

  async #mapRecipe(targetPlatform?: Platform, execCtx?: RecipeExecCtx, variant?: string) {
    if (targetPlatform) {
      const variants = await this.getVariants(targetPlatform);
      if (variant ? !variants.includes(variant) : variants.length > 0) {
        throw new Error(
          `${targetPlatform} is built as the variants [${variants.join(", ")}], ` +
            `not ${variant ? `"${variant}"` : "without one"}`,
        );
      }
    } else if (variant || this.props.variants) {
      throw new Error("a recipe with variants can only be mapped for a single target platform");
    }

    const v = await this.getVersion();

    const simpleRecipe: any = {
      schema_version: 1,
      package: {
        name: this.props.name,
        version: v.semver ?? v.raw,
      },
      context: {
        rawVersion: v.raw,
      },
    };

    const sources = await this.#mapSources(targetPlatform, variant);
    if (sources.length > 0) simpleRecipe.source = sources;

    simpleRecipe.build = await this.#mapBuild(simpleRecipe, targetPlatform, execCtx, variant);

    const tests = this.#mapTests(targetPlatform, execCtx, variant);
    if (tests) simpleRecipe.tests = tests;

    const userReqs = await this.#resolveRequirements(targetPlatform, variant);
    if (userReqs) {
      if (!simpleRecipe.requirements) simpleRecipe.requirements = {};
      if (userReqs.build) {
        if (!simpleRecipe.requirements.build) simpleRecipe.requirements.build = [];
        const items = Array.isArray(userReqs.build) ? userReqs.build : [userReqs.build];
        simpleRecipe.requirements.build.push(...items);
      }
      if (userReqs.host) {
        if (!simpleRecipe.requirements.host) simpleRecipe.requirements.host = [];
        const items = Array.isArray(userReqs.host) ? userReqs.host : [userReqs.host];
        simpleRecipe.requirements.host.push(...items);
      }
      if (userReqs.run) {
        if (!simpleRecipe.requirements.run) simpleRecipe.requirements.run = [];
        const items = Array.isArray(userReqs.run) ? userReqs.run : [userReqs.run];
        simpleRecipe.requirements.run.push(...items);
      }
      if (userReqs.run_constraints) {
        if (!simpleRecipe.requirements.run_constraints) simpleRecipe.requirements.run_constraints = [];
        const items = Array.isArray(userReqs.run_constraints) ? userReqs.run_constraints : [userReqs.run_constraints];
        simpleRecipe.requirements.run_constraints.push(...items);
      }
      if (userReqs.run_exports) simpleRecipe.requirements.run_exports = userReqs.run_exports;
      if (userReqs.ignore_run_exports) simpleRecipe.requirements.ignore_run_exports = userReqs.ignore_run_exports;
    }

    if (this.props.about) simpleRecipe.about = this.props.about;
    if (this.props.extra) simpleRecipe.extra = this.props.extra;

    return simpleRecipe;
  }

  async #mapSources(targetPlatform?: Platform, variant?: string) {
    const resolvedSources = await this.getSources();
    if (Array.isArray(resolvedSources)) return resolvedSources;

    const sources = [];

    if (!isPlatformMapped(resolvedSources)) {
      sources.push(resolvedSources);
    } else {
      if (targetPlatform) {
        const platformSources = resolvedSources[targetPlatform];
        const newSources = Array.isArray(platformSources) || !platformSources
          ? platformSources
          : platformSources[variant ?? ""];
        if (newSources) {
          for (const newSource of newSources) {
            if ("sha256" in newSource && typeof newSource.sha256 === "function") {
              newSource.sha256 = await newSource.sha256();
            }
            sources.push(newSource);
          }
        }
      } else {
        for (const [platform, newSources] of Object.entries(resolvedSources)) {
          if (!Array.isArray(newSources)) {
            throw new Error(`the sources for ${platform} are keyed by variant, which needs a single target platform`);
          }
          for (const newSource of newSources) {
            if ("sha256" in newSource && typeof newSource.sha256 === "function") {
              newSource.sha256 = await newSource.sha256();
            }
            sources.push(
              {
                if: `target_platform == "${platform}"`,
                then: newSource,
              },
            );
          }
        }
      }
    }

    return sources;
  }

  /**
   * Builds the `deno run` invocation used to execute the original (unbundled) `recipe.ts` for
   * either the build or test phase. `DENO_DIR` is pinned to the cache that was warm at
   * generate-time so the isolated rattler-build env doesn't need network access to re-resolve
   * jsr:/npm: dependencies.
   */
  #execScript(mode: "build" | "test", execCtx: RecipeExecCtx, win: boolean, variant?: string): string {
    const cmd = `deno run -A --config ${execCtx.denoConfigPath} ${execCtx.recipeTsPath} execute --${mode} ` +
      "--build-platform ${{ build_platform }} " +
      "--target-platform ${{ target_platform }} " +
      "--pkg-version-raw ${{ rawVersion }}" +
      (variant ? ` --variant ${variant}` : "");
    return win ? `set DENO_DIR=${execCtx.denoDir}&& ${cmd}` : `DENO_DIR=${execCtx.denoDir} ${cmd}`;
  }

  async #mapBuild(simpleRecipe: any, targetPlatform?: Platform, execCtx?: RecipeExecCtx, variant?: string) {
    // A copy, as a recipe is mapped once per platform & variant it builds
    const build = { ...this.props.build } as any;

    if (variant) {
      if (build.string) throw new Error("build.string can not be set on a recipe with variants");
      build.string = `${variant}_h\${{ hash }}_\${{ build_number }}`;
      const downPrioritize = this.props.variants?.[variant]?.downPrioritize;
      if (downPrioritize) build.variant = { ...build.variant, down_prioritize_variant: downPrioritize };
    }

    if (this.#props.build.func) {
      if (!execCtx) throw new Error("execCtx is required to map a recipe with a build.func");
      if (targetPlatform) {
        build.script = [this.#execScript("build", execCtx, targetPlatform.startsWith("win"), variant)];
      } else {
        build.script = [{
          if: "build_platform | split('-') | first == win",
          then: this.#execScript("build", execCtx, true),
          else: this.#execScript("build", execCtx, false),
        }];
      }
      delete build.func;
      if (!simpleRecipe.requirements) simpleRecipe.requirements = {};
      if (!simpleRecipe.requirements.build) simpleRecipe.requirements.build = [];
      simpleRecipe.requirements.build.push(`deno=${Deno.version.deno}`);
    }

    if (!targetPlatform) {
      build.skip = (await this.getPlatforms())
        .map((_) => `target_platform != "${_}"`)
        .join(" and ");
    }

    return build;
  }

  #mapTests(targetPlatform?: Platform, execCtx?: RecipeExecCtx, variant?: string) {
    const tests = this.props.tests as any;

    if (tests && !Array.isArray(tests)) {
      // A copy, as a recipe is mapped once per platform & variant it builds
      const { func, ...test } = tests;
      if (func) {
        if (!execCtx) throw new Error("execCtx is required to map a recipe with a tests.func");
        test.script = targetPlatform ? this.#execScript("test", execCtx, targetPlatform.startsWith("win"), variant) : [{
          if: "build_platform | split('-') | first == win",
          then: this.#execScript("test", execCtx, true),
          else: this.#execScript("test", execCtx, false),
        }];
        const build = test.requirements?.build ?? [];
        test.requirements = {
          ...test.requirements,
          build: [...(Array.isArray(build) ? build : [build]), `deno=${Deno.version.deno}`],
        };
      }
      return [test];
    }

    return tests;
  }

  /**
   * Resolves `this.props.requirements` into a plain `Requirements` object.
   *
   * If `requirements` was declared as a static object it is returned as-is.
   * If it was declared as a function, it is invoked with a `RequirementsContext`
   * derived from `targetPlatform` (see `lib/models/requirements_context.ts`).
   */
  async #resolveRequirements(targetPlatform?: Platform, variant?: string) {
    const raw = this.props.requirements;
    if (!raw) return undefined;
    if (typeof raw !== "function") return raw;

    const version = await this.getVersion();
    const [targetOs, targetArch] = targetPlatform!.split("-") as [PlatformOs, PlatformArch];

    return await raw(RequirementsContext.parse({
      targetPlatform,
      targetOs,
      targetArch,
      unix: targetOs !== "win",
      exe: (name: string) => targetOs === "win" ? `${name}.exe` : name,
      pkgVersion: version.semver,
      pkgVersionRaw: version.raw,
      noarch: this.props.build.noarch,
      variant,
    }));
  }

  async #jsonSchema(): Promise<AnySchema> {
    const tmpDir = Deno.build.os === "windows"
      ? Deno.env.get("TEMP") ?? "C:/Windows/Temp"
      : Deno.env.get("TMPDIR") ?? "/tmp";
    const cachedSchema = path.join(tmpDir, "rattler-recipe-json-schema.json");
    try {
      return JSON.parse(await Deno.readTextFile(cachedSchema));
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        const schema = await ky.get(JSON_SCHEMA_URL).json();
        await Deno.writeTextFile(cachedSchema, JSON.stringify(schema));
        return schema as AnySchema;
      }
      throw e;
    }
  }

  async #ajvValidator(): Promise<ValidateFunction<unknown>> {
    const ajv = addFormats(new Ajv({}), ["uri", "uri-reference"]);
    return ajv.compile(await this.#jsonSchema());
  }

  async toObject(
    targetPlatform?: Platform,
    execCtx?: RecipeExecCtx,
    variant?: string,
  ): Promise<z.output<typeof SimpleRecipe>> {
    const recipe = await this.#mapRecipe(targetPlatform, execCtx, variant);
    const validate = await this.#ajvValidator();
    if (!validate(recipe)) {
      throw new Error(`JSON Schema Invalid: ${JSON.stringify(validate.errors)} - ${JSON.stringify(recipe)}`);
    }
    return recipe as z.output<typeof SimpleRecipe>;
  }
}
