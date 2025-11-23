import { z } from "zod";
import { Test } from "./test.ts";
import { Source } from "./source.ts";
import { About } from "./about.ts";
import { Build } from "./build.ts";
import { Requirements } from "./requirements.ts";

export const SimpleRecipe = z.object({
  /**
   * The version of the YAML schema for a recipe.
   * If the version is omitted it is assumed to be 1.
   */
  schema_version: z.number().int().default(1),

  /**
   * The package name and version.
   */
  package: z.object({
    name: z.string(),
    version: z.string(),
  }),

  /**
   * A human readable description of the package information
   */
  about: About.optional(),

  /**
   * The source items to be downloaded and used for the build.
   */
  source: z.union([Source, z.array(Source)]).optional(),

  /**
   * Describes how the package should be build.
   */
  build: Build.optional(),

  /**
   * Tests to run after packaging.
   */
  tests: z.union([Test, z.array(Test)]).optional(),

  /**
   * The package dependencies.
   */
  requirements: Requirements.optional(),

  /**
   * An set of arbitrary values that are included in the package manifest
   */
  extra: z.record(z.string(), z.string()).optional(),
});
