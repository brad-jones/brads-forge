// deno-lint-ignore-file no-explicit-any
import { z } from "zod";
import { Ajv, Plugin, AnySchema, ValidateFunction } from "ajv";
import ajvFormats, { FormatsPluginOptions } from "ajv-formats";
import ky from "ky";
import { RecipeProps } from "./recipe_props.ts";
import * as path from "@std/path";
import { Command } from "@cliffy/command";
import { BuildContext } from "./build.ts";
import { SimpleRecipe } from "./rattler/simple_recipe.ts";
import { Platform } from "./platform.ts";
import { Source } from "./rattler/source.ts";

// see: https://github.com/ajv-validator/ajv-formats/issues/85
const addFormats = ajvFormats as unknown as Plugin<FormatsPluginOptions>;

// see: https://rattler.build/latest/reference/recipe_file/#spec-reference
const JSON_SCHEMA_URL = "https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json";

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
      .action(async ({ build, test, buildPlatform, targetPlatform, pkgVersionRaw }) => {
        const buildParts = buildPlatform.split("-");
        const buildOs = buildParts[0];
        const buildArch = buildParts[1];

        const targetParts = targetPlatform.split("-");
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
          targetPlatform,
          targetOs,
          targetArch,
          pkgVersionRaw,
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

  #cachedSources?:
    | z.output<typeof Source>
    | z.output<typeof Source>[]
    | Partial<Record<Platform, z.output<typeof Source>[]>>;

  /**
   * Returns & caches the latest sources fo the recipe.
   * Calling this many times will produce the same output
   * & not result in additional network calls.
   */
  async getSources() {
    if (!this.#cachedSources) {
      this.#cachedSources = await this.props.sources((await this.getVersion()).raw);
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
    if ("git" in sources || "url" in sources || "path" in sources) {
      return [];
    } else {
      return Object.keys(sources) as Platform[];
    }
  }

  async #mapRecipe(targetPlatform?: Platform) {
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

    const sources = await this.#mapSources(targetPlatform);
    if (sources.length > 0) simpleRecipe.source = sources;

    simpleRecipe.build = await this.#mapBuild(simpleRecipe, targetPlatform);

    const tests = this.#mapTests();
    if (tests) simpleRecipe.tests = tests;

    if (this.props.about) simpleRecipe.about = this.props.about;
    if (this.props.extra) simpleRecipe.extra = this.props.extra;

    return simpleRecipe;
  }

  async #mapSources(targetPlatform?: Platform) {
    const resolvedSources = await this.getSources();
    if (Array.isArray(resolvedSources)) return resolvedSources;

    const sources = [];

    if ("git" in resolvedSources || "url" in resolvedSources || "path" in resolvedSources) {
      sources.push(resolvedSources);
    } else {
      if (targetPlatform) {
        const newSources = resolvedSources[targetPlatform];
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

  async #mapBuild(simpleRecipe: any, targetPlatform?: Platform) {
    const build = this.props.build as any;

    if (this.#props.build.func) {
      if (targetPlatform) {
        if (targetPlatform.startsWith("win")) {
          build.script = [
            "deno run -A %RECIPE_DIR%/bundled-recipe.ts execute --build " +
            "--build-platform ${{ build_platform }} " +
            "--target-platform ${{ target_platform }} " +
            "--pkg-version-raw ${{ rawVersion }}",
          ];
        } else {
          build.script = [
            "deno run -A $RECIPE_DIR/bundled-recipe.ts execute --build " +
            "--build-platform ${{ build_platform }} " +
            "--target-platform ${{ target_platform }} " +
            "--pkg-version-raw ${{ rawVersion }}",
          ];
        }
      } else {
        build.script = [{
          if: "build_platform | split('-') | first == win",
          then: "deno run -A %RECIPE_DIR%/bundled-recipe.ts execute --build " +
            "--build-platform ${{ build_platform }} " +
            "--target-platform ${{ target_platform }} " +
            "--pkg-version-raw ${{ rawVersion }}",
          else: "deno run -A $RECIPE_DIR/bundled-recipe.ts execute --build " +
            "--build-platform ${{ build_platform }} " +
            "--target-platform ${{ target_platform }} " +
            "--pkg-version-raw ${{ rawVersion }}",
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

  #mapTests() {
    const tests = this.props.tests as any;

    if (tests && !Array.isArray(tests)) {
      if ("func" in tests) {
        tests.script = "deno run -A ./info/recipe/bundled-recipe.ts execute --test " +
          "--build-platform ${{ build_platform }} " +
          "--target-platform ${{ target_platform }} " +
          "--pkg-version-raw ${{ rawVersion }}";
        if (!tests.requirements) tests.requirements = {};
        if (!tests.requirements.build) tests.requirements.build = [];
        tests.requirements.build.push(`deno=${Deno.version.deno}`);
        delete tests.func;
      }
      return [{ ...tests }];
    }

    return tests;
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
    const ajv = addFormats(new Ajv({}), ["uri"]);
    return ajv.compile(await this.#jsonSchema());
  }

  async toObject(targetPlatform?: Platform): Promise<z.output<typeof SimpleRecipe>> {
    const recipe = await this.#mapRecipe(targetPlatform);
    const validate = await this.#ajvValidator();
    if (!validate(recipe)) {
      throw new Error(`JSON Schema Invalid: ${JSON.stringify(validate.errors)}`);
    }
    return recipe as z.output<typeof SimpleRecipe>;
  }
}
