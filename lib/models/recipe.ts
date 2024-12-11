import { z } from "zod";
import { Ajv, Plugin, AnySchema, ValidateFunction } from "ajv";
import ajvFormats, { FormatsPluginOptions } from "ajv-formats";
import ky from "ky";
import { RecipeProps } from "./recipe_props.ts";
import * as path from "@std/path";
import { Command } from "@cliffy/command";
import { BuildContext } from "./build.ts";
import { SimpleRecipe } from "./rattler/simple_recipe.ts";
import { invertPlatforms, Platform } from "./platform.ts";
import { Source } from "./rattler/source.ts";

// see: https://github.com/ajv-validator/ajv-formats/issues/85
const addFormats = ajvFormats as unknown as Plugin<FormatsPluginOptions>;

// see: https://rattler.build/latest/reference/recipe_file/#spec-reference
const JSON_SCHEMA_URL = "https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json";

export class Recipe {
  readonly props: z.output<typeof RecipeProps>;
  readonly #props: z.input<typeof RecipeProps>;
  #platformSources?: Partial<Record<Platform, z.output<typeof Source>>>;

  get hasJsFuncs(): boolean {
    if (this.#props.build.func) return true;
    if (this.#props.tests && "func" in this.#props.tests) return true;
    return false;
  }

  constructor(props: z.input<typeof RecipeProps>) {
    this.props = RecipeProps.parse(props);
    this.#props = props;

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
      .action(async ({ build, test, buildPlatform, targetPlatform }) => {
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
        });

        if (build) {
          const buildFunc = this.props.build.func;
          if (!buildFunc) throw new Error(`missing build func`);
          await buildFunc(buildCtx);
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

  async #mapRecipe() {
    const simpleRecipe: any = {
      schema_version: 1,
      package: {
        name: this.props.name,
        version: await this.props.version(),
      },
    };

    const sources = await this.#mapSources(simpleRecipe.package.version);
    if (sources.length > 0) simpleRecipe.source = sources;

    simpleRecipe.build = this.#mapBuild(simpleRecipe);

    const tests = this.#mapTests();
    if (tests) simpleRecipe.tests = tests;

    if (this.props.about) simpleRecipe.about = this.props.about;
    if (this.props.extra) simpleRecipe.extra = this.props.extra;

    return simpleRecipe;
  }

  async #mapSources(version: string) {
    const resolvedSources = await this.props.sources(version);
    if (Array.isArray(resolvedSources)) return resolvedSources;

    const sources = [];

    if ("git" in resolvedSources || "url" in resolvedSources || "path" in resolvedSources) {
      sources.push(resolvedSources);
    } else {
      this.#platformSources = resolvedSources;
      for (const [platform, src] of Object.entries(resolvedSources)) {
        sources.push(
          {
            if: `target_platform == "${platform}"`,
            then: src,
          },
        );
      }
    }

    return sources;
  }

  #mapBuild(simpleRecipe: any) {
    const build = this.props.build as any;

    if (build.func) {
      build.script = [{
        if: "build_platform | split('-') | first == win",
        then:
          "deno run -A %RECIPE_DIR%/bundled-recipe.ts execute --build --build-platform ${{ build_platform }} --target-platform ${{ target_platform }}",
        else:
          "deno run -A $RECIPE_DIR/bundled-recipe.ts execute --build --build-platform ${{ build_platform }} --target-platform ${{ target_platform }}",
      }];
      delete build.func;
      if (!simpleRecipe.requirements) simpleRecipe.requirements = {};
      if (!simpleRecipe.requirements.build) simpleRecipe.requirements.build = [];
      simpleRecipe.requirements.build.push(`deno=${Deno.version.deno}`);
    }

    const buildInversePlatformList = (platforms: Platform[]) =>
      platforms.map((_) => `target_platform != "${_}"`).join(" and ");

    if (this.props.platforms) {
      build.skip = buildInversePlatformList(this.props.platforms);
    } else {
      if (this.#platformSources) {
        build.skip = buildInversePlatformList(
          Object.keys(this.#platformSources).map((_) => Platform.parse(_)),
        );
      }
    }

    return build;
  }

  #mapTests() {
    const tests = this.props.tests as any;

    if (tests && !Array.isArray(tests)) {
      if ("func" in tests) {
        tests.script =
          "deno run -A ./info/recipe/bundled-recipe.ts execute --test --build-platform ${{ build_platform }} --target-platform ${{ target_platform }}";
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

  async toObject(): Promise<z.output<typeof SimpleRecipe>> {
    const recipe = await this.#mapRecipe();
    const validate = await this.#ajvValidator();
    if (!validate(recipe)) {
      throw new Error(`JSON Schema Invalid: ${JSON.stringify(validate.errors)}`);
    }
    return recipe as z.output<typeof SimpleRecipe>;
  }
}
