import { z } from "zod";
import { Platform } from "./platform.ts";
import { About } from "./rattler/about.ts";
import { Build } from "./build.ts";
import { Requirements } from "./rattler/requirements.ts";
import { Source } from "./rattler/source.ts";
import { FuncTest } from "./test.ts";
import { Test } from "./rattler/test.ts";

export const RecipeProps = z.object({
  /**
   * The name of the package.
   */
  name: z.string(),

  /**
   * A function that returns the lastest version of this package.
   * A typical source would be the git tags for a remote repo.
   */
  version: z.function().returns(z.promise(z.string())),

  /**
   * A human readable description of the package information
   */
  about: About.optional(),

  /**
   * The source items to be downloaded and used for the build.
   */
  sources: z.function()
    .args(z.string())
    .returns(
      z.union([
        z.union([Source, z.array(Source), z.record(Platform, Source)]),
        z.promise(z.union([Source, z.array(Source), z.record(Platform, Source)])),
      ]),
    ),

  /**
   * A list of platforms that this recipe supports.
   *
   * If not given, then this will be inferred from the given sources.
   * If those are not mapped to a platform then the recipe will build
   * for any target platform.
   */
  platforms: z.array(Platform).optional(),

  /**
   * Describes how the package should be built.
   */
  build: Build,

  /**
   * Tests to run after packaging.
   */
  tests: z.union([FuncTest, z.array(Test)]).optional(),

  /**
   * The package dependencies.
   */
  requirements: Requirements.optional(),

  /**
   * An set of arbitrary values that are included in the package manifest
   */
  extra: z.record(z.string()).optional(),
});
