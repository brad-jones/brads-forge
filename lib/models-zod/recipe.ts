import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { Test } from "./test.ts";
import { About } from "./about.ts";
import { Build } from "./build.ts";
import { Source } from "./source.ts";
import { Requirements } from "./requirements.ts";
import { Platform, PlatformArch, PlatformOs } from "./platform.ts";

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
   * A function that returns a sorted (newest to oldest) list of the last 5
   * version numbers from an upstream source. Such as Github Releases or git tags.
   *
   * Any versions that have not yet been published will be in the next GHA run.
   *
   * NB: Why limit this to 5 versions? We do not want to build & package years
   * worth of old versions that could exhaust our GHA build minutes.
   */
  versions: () => string[];

  /**
   * The source items to be downloaded and used for the build.
   */
  sources: (version: string, os: PlatformOs, arch: PlatformArch) => Source[];

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
 * Based On: https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json
 * Also see: https://prefix-dev.github.io/rattler-build/recipe_file/#spec-reference
 * Minus the context, conditionals & the "ComplexRecipe".
 */
export class Recipe {
  props: RecipeProps;

  constructor(props: RecipeProps) {
    this.props = z.strictObject({
      name: z.string(),
      about: About.optional(),
      platforms: z.array(Platform),
      versions: z.function()
        .returns(z.union([
          z.array(z.string()),
          z.promise(z.array(z.string())),
        ])),
      sources: z.function()
        .args(z.string(), PlatformOs, PlatformArch)
        .returns(z.array(Source)),
      build: Build.optional(),
      test: Test.optional(),
      requirements: Requirements.optional(),
      extra: z.record(z.string(), z.string()).optional(),
    }).parse(props) as unknown as RecipeProps;

    console.log(this.props);
  }
}
