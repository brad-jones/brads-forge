import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";
import { Platform, PlatformArch, PlatformOs } from "lib/mod.ts";

// see: https://github.com/prefix-dev/rattler-build/blob/main/src/recipe/parser/test.rs

export interface Test {
  /**
   * Test script to be used.
   *
   * If not given, tries to find 'test.sh' on Unix or 'test.bat' on Windows
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
      suffixExe: (filename: string) => string;
    },
  ) => Promise<void> | void;

  /**
   * In addition to the runtime requirements, you can specify requirements
   * needed during testing. The runtime requirements that you specified in
   * the "run" section described above are automatically included during testing.
   *
   * @see https://prefix-dev.github.io/rattler-build/recipe_file/#test-requirements
   */
  requires?: string | string[];

  /**
   * List of Python modules or packages that will be imported in the test environment.
   *
   * @see https://prefix-dev.github.io/rattler-build/recipe_file/#python-imports
   */
  imports?: string | string[];

  /**
   * Extra files to be copied to the test directory from the build dir (can be globs)
   *
   * @see https://prefix-dev.github.io/rattler-build/testing/#how-tests-are-translated
   */
  files?: string | string[];

  /**
   * Extra files to be copied to the test directory from the source directory (can be globs)
   *
   * @see https://prefix-dev.github.io/rattler-build/testing/#how-tests-are-translated
   */
  sourceFiles?: string | string[];

  /**
   * Checks if the built package contains the mentioned items.
   *
   * @see https://prefix-dev.github.io/rattler-build/recipe_file/#check-for-package-contents
   */
  packageContents?: {
    /**
     * Checks for the existence of files inside $PREFIX or %PREFIX% or,
     * checks that there is at least one file matching the specified `glob`
     * pattern inside the prefix.
     */
    files?: string | string[];

    /**
     * Checks for the existence of `mamba/api/__init__.py` inside of the
     * Python site-packages directory (note: also see Python import checks).
     */
    sitePackages?: string | string[];

    /**
     * Looks in $PREFIX/bin/mamba for unix and %PREFIX%\Library\bin\mamba.exe on Windows
     *
     * note: also check the `commands` and execute something like `mamba --help`
     * to make sure things work fine
     */
    bins?: string | string[];

    /**
     * Searches for `$PREFIX/lib/libmamba.so` or `$PREFIX/lib/libmamba.dylib`
     * on Linux or macOS, on Windows for %PREFIX%\Library\lib\mamba.dll &
     * %PREFIX%\Library\bin\mamba.bin
     */
    libs?: string | string[];

    /**
     * Searches for `$PREFIX/include/libmamba/mamba.hpp` on unix, and
     * on Windows for `%PREFIX%\Library\include\mamba.hpp`
     */
    includes?: string | string[];
  };
}
