import * as semver from "https://deno.land/std@0.210.0/semver/mod.ts";
import { Platform, PlatformArch, PlatformOs } from "lib/mod.ts";

// see: https://github.com/prefix-dev/rattler-build/blob/main/src/recipe/parser/build.rs
// LOL https://github.com/prefix-dev/rattler-build/blob/main/src/recipe/parser/build.rs#L46
// I think my typescript interface is more complete than their rust parser :facepalm:

export interface Build {
  /**
   * Build number to version current build in addition to package version
   */
  number?: number;

  /**
   * Build string to identify build variant (if not explicitly set,
   * computed automatically from used build variant).
   */
  string?: string;

  /**
   * List of conditions under which to skip the build of the package.
   */
  skip?: string | string[];

  /**
   * Build script to be used.
   *
   * If not given, tries to find 'build.sh' on Unix or 'bld.bat' on Windows
   * inside the recipe folder.
   *
   * Or you can provide a function here & we will execute that :)
   */
  script?: (
    ctx: {
      version: semver.SemVer;
      targetPlatform: Platform;
      targetOs: PlatformOs;
      targetArch: PlatformArch;
      prefixDir: string;
      suffixExe: (filename: string) => string;
    },
  ) => Promise<void> | void;

  /**
   * Environment variables to either pass through to the script environment or set.
   */
  scriptEnv?: {
    /**
     * Environments variables to leak into the build environment from the host system.
     * During build time these variables are recorded and stored in the package output.
     * Use 'secrets' for environment variables that should not be recorded.
     */
    passthrough?: string | string[];

    /**
     * Environment variables to set in the build environment.
     */
    env?: Record<string, string>;

    /**
     * Environment variables to leak into the build environment from the host
     * system that contain sensitve information. Use with care because this
     * might make recipes no longer reproducible on other machines.
     */
    secrets?: string | string[];
  };

  /**
   * Can be either 'generic' or 'python'.
   *
   * A noarch 'python' package compiles .pyc files upon installation.
   */
  noarch?: "generic" | "python";

  /**
   * Only valid if 'noarch: python' - list of all entry points of the package.
   *
   * e.g. 'bsdiff4 = bsdiff4.cli:main_bsdiff4'
   */
  entryPoints?: string | string[];

  /**
   * Additional 'run' dependencies added to a package that is build against this package.
   */
  runExports?: string | string[] | {
    /**
     * Weak run exports apply from the host env to the run env
     */
    weak?: string;

    /**
     * Strong run exports apply from the build and host env to the run env
     */
    strong?: string;

    /**
     * Noarch run exports are the only ones looked at when building noarch packages
     */
    noarch?: string;

    /**
     * Weak run constrains add run_constrains from the host env
     */
    weakConstrains?: string;

    /**
     * Strong run constrains add run_constrains from the build and host env
     */
    strongConstrains?: string;
  };

  /**
   * Ignore specific 'run' dependencies that are added by dependencies
   * in our 'host' requirements section that have 'run_exports'.
   */
  ignoreRunExports?: string | string[];

  /**
   * Ignore 'run_exports' from the specified dependencies in our 'host' section.
   */
  ignoreRunExportsFrom?: string | string[];

  /**
   * Whether or not to include the rendered recipe in the final package.
   */
  includeRecipe?: boolean;

  /**
   * Script to execute when installing - before linking. Highly discouraged!
   */
  preLink?: string; // pre-link

  /**
   * Script to execute when installing - after linking.
   */
  postLink?: string; // post-link

  /**
   * Script to execute when removing - before unlinking.
   */
  preUnlink?: string; // pre-unlink

  /**
   * A list of files that are included in the package but should not be
   * installed when installing the package.
   */
  noLink?: string | string[];

  /**
   * A list of files that should be excluded from binary relocation
   * or False to ignore all binary files.
   */
  binaryRelocation?: false | string | string[];

  /**
   * A list of files to force being detected as A TEXT file for prefix replacement.
   */
  hasPrefixFiles?: string | string[];

  /**
   * A list of files to force being detected as A BINARY file for prefix replacement.
   */
  binaryHasPrefixFiles?: string | string[];

  /**
   * A list of files that are not considered for prefix replacement
   * or True to ignore all files.
   */
  ignorePrefixFiles?: true | string | string[];

  /**
   * Whether to detect binary files with prefix or not.
   * Defaults to True on Unix and False on Windows.
   */
  detectBinaryFilesWithPrefix?: boolean;

  /**
   * A list of python files that should not be compiled to .pyc files at install time.
   */
  skipCompilePyc?: string | string[];

  /**
   * A list of rpaths (Linux only).
   */
  rpaths?: string | string[];

  /**
   * Files to be included even if they are present in the PREFIX before building.
   */
  alwaysIncludeFiles?: string | string[];

  osxIsApp?: boolean;
  disablePip?: boolean;
  preserveEggDir?: boolean;
  forceUseKeys?: string | string[];
  forceIgnoreKeys?: string | string[];
  mergeBuildHost?: boolean;
  missingDsoWhitelist?: string | string[];
  runpathWhitelist?: string | string[];
  errorOverdepending?: boolean;
  errorOverlinking?: boolean;
}
