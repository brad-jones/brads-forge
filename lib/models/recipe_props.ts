import { z } from "zod";
import { Build } from "./build.ts";
import { Platform } from "./platform.ts";
import { About } from "./rattler/about.ts";
import { Requirements } from "./rattler/requirements.ts";
import { Source } from "./rattler/source.ts";
import { Test } from "./rattler/test.ts";
import { RequirementsContext } from "./requirements_context.ts";
import { FuncTest } from "./test.ts";

export const RecipeProps = z.object({
  /**
   * The name of the package.
   */
  name: z.string(),

  /**
   * A human readable description of the package information
   */
  about: About.optional(),

  /**
   * A function that returns the lastest version of this package.
   * A typical source would be the git tags for a remote repo.
   */
  version: z.custom<
    () => Promise<{
      /**
       * The version string un-altered from the original upstream source.
       */
      raw: string;

      /**
       * A parsed semver string.
       *
       * This means it has succesfully been parsed by `@std/semver.parse`.
       * But not all packages follow the convention so we can not rely on
       * this to always be available.
       */
      semver?: string;
    }>
  >(),

  /**
   * The source items to be downloaded and used for the build.
   */
  sources: z.custom<
    (tag: string, semver?: string) =>
      | z.output<typeof Source>
      | z.output<typeof Source>[]
      | Record<Platform, z.output<typeof Source>[]>
      | Partial<Record<Platform, z.output<typeof Source>[]>>
      | Promise<
        | z.output<typeof Source>
        | z.output<typeof Source>[]
        | Record<Platform, z.output<typeof Source>[]>
        | Partial<Record<Platform, z.output<typeof Source>[]>>
      >
  >(),

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
   *
   * Can either be a static `Requirements` object (applied as-is to every
   * generated platform), or a function that receives a `RequirementsContext`
   * and returns a `Requirements` object — useful for declaring dependencies
   * that only apply on certain platforms (eg: unix-only).
   */
  requirements: z.union([
    Requirements,
    z.custom<
      (ctx: z.output<typeof RequirementsContext>) =>
        | z.output<typeof Requirements>
        | Promise<z.output<typeof Requirements>>
    >(),
  ]).optional(),

  /**
   * An set of arbitrary values that are included in the package manifest
   */
  extra: z.record(z.string(), z.string()).optional(),
});
