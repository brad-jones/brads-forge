import { mapValues, mapKeys, snake, isObject } from "https://esm.sh/radash@11.0.0#^";
import * as yaml from "https://deno.land/std@0.211.0/yaml/mod.ts#^";
import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts#^";

import { Test } from "./test.ts";
import { About } from "./about.ts";
import { Build } from "./build.ts";
import { Source } from "./source.ts";
import { DslCtx, makeDslCtx } from "./dslctx.ts";
import { Requirements } from "./requirements.ts";
import { Platform, parsePlatform, currentOs } from "./platform.ts";

export interface RecipeProps {
  /**
   * The name of the package.
   */
  name: string;

  /**
   * A human readable description of the package information
   */
  about?: About;

  /**
   * A list of platforms that this recipe supports.
   */
  platforms: Platform[];

  /**
   * A function that returns a sorted (newest to oldest) list of the last 2
   * version numbers from an upstream source. Such as Github Releases or git tags.
   *
   * Any versions that have not yet been published will be in the next GHA run.
   *
   * NB: Why limit this to 2 versions? We do not want to build & package years
   * worth of old versions that could exhaust our GHA build minutes.
   */
  versions: () => Promise<semver.SemVer[]> | semver.SemVer[];

  /**
   * The source items to be downloaded and used for the build.
   */
  sources: (ctx: DslCtx) => Promise<Source[]> | Source[];

  /**
   * Describes how the package should be build.
   */
  build?: Build;

  /**
   * Tests to run after packaging.
   */
  test?: Test;

  /**
   * The package dependencies.
   */
  requirements?: Requirements;

  /**
   * An set of arbitrary values that are included in the package manifest
   */
  extra?: Record<string, string>;
}

/**
 * This represents a rattler-build recipe albeit with some tweaks.
 * Notably the absence of the context, conditionals & the "ComplexRecipe".
 *
 * @see https://prefix-dev.github.io/rattler-build/recipe_file/#spec-reference
 * @also https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json
 */
export class Recipe {
  constructor(public props: RecipeProps) {
    // This is how we make a single recipe.ts file executable in it's own right
    // & is what the rendered YAML rattler recipe is configured to execute when
    // functions are provided for the build & test scripts.
    if (Deno.args.length > 0 && Deno.args[0] === "execute") {
      this.#executeCmd();
    }
  }

  /**
   * Map our Recipe into something that rattler-build can understand.
   *
   * @param variant The resolved variant that we want to build.
   * @returns A new object that can be serialized into YAML for rattler-build.
   */
  rattlerRecipe = (variant: { v: semver.SemVer; p: Platform; s: Source[] }) =>
    new RattlerRecipe({ ...variant, r: this });

  #executeCmd = async () =>
    await new Command()
      .name(`recipe-${this.props.name}`)
      .description("Deno rattler recipe runner")
      .option("--build", "If set the build script will be executed.")
      .option("--test", "If set the test script will be executed.")
      .option("--version <version:string>", "The version to build.")
      .option("--platform <platform:string>", "The target platform.")
      .action(async ({ build, test, version, platform }) => {
        const dslCtx = makeDslCtx(semver.parse(version!), parsePlatform(platform!));

        if (build && typeof this.props.build?.script === "function") {
          await this.props.build?.script!({
            ...dslCtx,
            prefixDir: Deno.env.get("PREFIX") ?? "",
          });
          return;
        }

        if (test && typeof this.props.test?.script === "function") {
          await this.props.test?.script!(dslCtx);
          return;
        }
      })
      .parse(Deno.args.slice(1));
}

export interface RattlerRecipeVariant {
  r: Recipe;
  v: semver.SemVer;
  p: Platform;
  s: Source[];
}

export class RattlerRecipe {
  // deno-lint-ignore no-explicit-any
  mappedRecipe: any;

  constructor(public variant: RattlerRecipeVariant) {
    // The json stringify & parse removes all undefined props
    this.mappedRecipe = JSON.parse(JSON.stringify(mapKeysDeep({
      package: this.#mapPackage(),
      source: this.#mapSources(),
      build: this.#mapBuild(),
      test: this.#mapTest(),
      requirements: this.#mapRequirements(),
      extra: variant.r.props.extra,
    }, snake)));
  }

  #mapPackage = () => ({
    name: this.variant.r.props.name,
    version: semver.format(this.variant.v),
  });

  #mapSources = () =>
    this.variant.s.map((s) => {
      // deno-lint-ignore no-explicit-any
      const mappedS = { ...s } as any;
      if (s.hash) {
        delete mappedS["hash"];
        const hashKey = s.hash.algorithm.replaceAll("-", "").toLowerCase();
        mappedS[hashKey] = s.hash.hashString;
      }
      return mappedS;
    });

  #mapBuild() {
    if (typeof this.variant.r.props.build === "undefined") return undefined;

    const b = { ...this.variant.r.props.build };
    if (typeof b.script === "function") {
      // dprint-ignore
      b.script = [
        "deno", "run", "-A", currentOs === "win" ? "%RECIPE_DIR%/recipe.js" : "$RECIPE_DIR/recipe.js",
        "execute", "--build",
        "--version", semver.format(this.variant.v),
        "--platform", this.variant.p,
      ].join(" ");
    }

    return b;
  }

  #mapTest() {
    if (typeof this.variant.r.props.test === "undefined") return undefined;

    const t = { ...this.variant.r.props.test };
    if (typeof t.script === "function") {
      // dprint-ignore
      t.script = [
        "deno", "run", "-A", "../recipe/recipe.js",
        "execute", "--test",
        "--version", semver.format(this.variant.v),
        "--platform", this.variant.p,
      ].join(" ");
      t.requires = ["deno", ...(mergeStringList(t.requires))];
    }

    // see: https://github.com/prefix-dev/rattler-build/issues/445
    // deno-lint-ignore no-explicit-any
    (t as any)["commands"] = t.script;
    delete t["script"];

    return t;
  }

  #mapRequirements() {
    let r = typeof this.variant.r.props.requirements === "undefined"
      ? undefined
      : { ...this.variant.r.props.requirements };

    if (typeof this.variant.r.props.build?.script === "function") {
      if (typeof r === "undefined") r = {};
      r.build = ["deno", ...(mergeStringList(r.build))];
    }

    return r;
  }

  toYaml = () => yaml.stringify(this.mappedRecipe);
}

// dprint-ignore
const mergeStringList = (v?: string | string[]) =>
  typeof v === "undefined" ? [] : Array.isArray(v) ? v : [v];

// Ported form: https://github.com/glennreyes/map-keys-deep
// Sometime TypeScript gives me a headache lol, hence the any exception.
// deno-lint-ignore no-explicit-any
const mapKeysDeep = (obj: any, mapFunc: (key: any, value: any) => any): any =>
  Array.isArray(obj) ? obj.map((v) => mapKeysDeep(v, mapFunc)) : mapValues(
    mapKeys(obj, mapFunc),
    (v) => isObject(v) ? mapKeysDeep(v, mapFunc) : v,
  );
