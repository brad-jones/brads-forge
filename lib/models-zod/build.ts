import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { OptionalStringList, PathNoBackslash } from "./utils.ts";

export type Build = z.infer<typeof Build>;

export const Build = z.strictObject({
  /**
   * Build number to version current build in addition to package version
   */
  number: z.number().int().optional(),

  /**
   * Build string to identify build variant (if not explicitly set,
   * computed automatically from used build variant).
   */
  string: z.string().optional(),

  /**
   * List of conditions under which to skip the build of the package.
   */
  skip: OptionalStringList,

  /**
   * Build script to be used.
   *
   * If not given, tries to find 'build.sh' on Unix or 'bld.bat' on Windows
   * inside the recipe folder.
   *
   * Or you can provide a function here & we will execute that :)
   */
  script: z.union([
    z.string(),
    z.array(z.string()),
    z.function().returns(z.union([z.void(), z.promise(z.void())])),
  ]).optional(),

  /**
   * Environment variables to either pass through to the script environment or set.
   */
  scriptEnv: z.strictObject({
    /**
     * Environments variables to leak into the build environment from the host system.
     * During build time these variables are recorded and stored in the package output.
     * Use 'secrets' for environment variables that should not be recorded.
     */
    passthrough: OptionalStringList,

    /**
     * Environment variables to set in the build environment.
     */
    env: z.record(z.string(), z.string()).optional(),

    /**
     * Environment variables to leak into the build environment from the host
     * system that contain sensitve information. Use with care because this
     * might make recipes no longer reproducible on other machines.
     */
    secrets: OptionalStringList,
  }).optional(),

  /**
   * Can be either 'generic' or 'python'.
   *
   * A noarch 'python' package compiles .pyc files upon installation.
   */
  noarch: z.enum(["generic", "python"]).optional(),

  /**
   * Only valid if 'noarch: python' - list of all entry points of the package.
   *
   * e.g. 'bsdiff4 = bsdiff4.cli:main_bsdiff4'
   */
  entryPoints: OptionalStringList,

  /**
   * Additional 'run' dependencies added to a package that is build against this package.
   */
  runExports: z.union([
    z.string(),
    z.array(z.string()),
    z.strictObject({
      /**
       * Weak run exports apply from the host env to the run env
       */
      weak: z.string().optional(),

      /**
       * Strong run exports apply from the build and host env to the run env
       */
      strong: z.string().optional(),

      /**
       * Noarch run exports are the only ones looked at when building noarch packages
       */
      noarch: z.string().optional(),

      /**
       * Weak run constrains add run_constrains from the host env
       */
      weakConstrains: z.string().optional(),

      /**
       * Strong run constrains add run_constrains from the build and host env
       */
      strongConstrains: z.string().optional(),
    }),
  ]).optional(),

  /**
   * Ignore specific 'run' dependencies that are added by dependencies
   * in our 'host' requirements section that have 'run_exports'.
   */
  ignoreRunExports: OptionalStringList,

  /**
   * Ignore 'run_exports' from the specified dependencies in our 'host' section.
   */
  ignoreRunExportsFrom: OptionalStringList,

  /**
   * Whether or not to include the rendered recipe in the final package.
   */
  includeRecipe: z.boolean().default(true).optional(),

  /**
   * Script to execute when installing - before linking. Highly discouraged!
   */
  preLink: z.string().optional(),

  /**
   * Script to execute when installing - after linking.
   */
  postLink: z.string().optional(),

  /**
   * Script to execute when removing - before unlinking.
   */
  preUnlink: z.string().optional(),

  /**
   * A list of files that are included in the package but should not be
   * installed when installing the package.
   */
  noLink: z.union([PathNoBackslash, z.array(PathNoBackslash)]).optional(),

  /**
   * A list of files that should be excluded from binary relocation
   * or False to ignore all binary files.
   */
  binaryRelocation: z.union([
    z.literal(false),
    PathNoBackslash,
    z.array(PathNoBackslash),
  ]).optional(),

  /**
   * A list of files to force being detected as A TEXT file for prefix replacement.
   */
  hasPrefixFiles: z.union([PathNoBackslash, z.array(PathNoBackslash)])
    .optional(),

  /**
   * A list of files to force being detected as A BINARY file for prefix replacement.
   */
  binaryHasPrefixFiles: z.union([PathNoBackslash, z.array(PathNoBackslash)])
    .optional(),

  /**
   * A list of files that are not considered for prefix replacement
   * or True to ignore all files.
   */
  ignorePrefixFiles: z.union([
    z.literal(true),
    PathNoBackslash,
    z.array(PathNoBackslash),
  ]).optional(),

  /**
   * Whether to detect binary files with prefix or not.
   * Defaults to True on Unix and False on Windows.
   */
  detectBinaryFilesWithPrefix: z.boolean().optional(),

  /**
   * A list of python files that should not be compiled to .pyc files at install time.
   */
  skipCompilePyc: z.union([PathNoBackslash, z.array(PathNoBackslash)])
    .optional(),

  /**
   * A list of rpaths (Linux only).
   */
  rpaths: z.union([z.string(), z.array(z.string())]).default(["/lib"]),

  /**
   * Files to be included even if they are present in the PREFIX before building.
   */
  alwaysIncludeFiles: OptionalStringList,

  osxIsApp: z.boolean().default(false).optional(),
  disablePip: z.boolean().default(false).optional(),
  preserveEggDir: z.boolean().default(false).optional(),
  forceUseKeys: OptionalStringList,
  forceIgnoreKeys: OptionalStringList,
  mergeBuildHost: z.boolean().default(false).optional(),
  missingDsoWhitelist: OptionalStringList,
  runpathWhitelist: OptionalStringList,
  errorOverdepending: z.boolean().default(false).optional(),
  errorOverlinking: z.boolean().default(false).optional(),
}).strict();
