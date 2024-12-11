import { z } from "zod";
import { Script } from "./script.ts";

export const ScriptTestElement = z.object({
  /**
   * A script to run to perform the test.
   */
  script: z.union([z.string(), Script, z.array(z.union([z.string(), Script]))]).optional(),

  /**
   * Additional dependencies to install before running the test.
   */
  requirements: z.object({
    /**
     * extra requirements with build_platform architecture (emulators, ...)
     */
    build: z.string().or(z.array(z.string())).optional(),

    /**
     * extra run dependencies
     */
    run: z.string().or(z.array(z.string())).optional(),
  }).optional(),

  /**
   * Additional files to include for the test.
   */
  files: z.object({
    /**
     * extra files from $SRC_DIR
     */
    source: z.string().or(z.array(z.string())).optional(),

    /**
     * extra files from $RECIPE_DIR
     */
    recipe: z.string().or(z.array(z.string())).optional(),
  }).optional(),
});

export const PythonTestElement = z.object({
  /**
   * Python specific test configuration
   */
  python: z.object({
    /**
     * A list of Python imports to check after having installed the built package.
     */
    imports: z.string().or(z.array(z.string())),

    /**
     * Whether or not to run pip check during the Python tests.
     */
    pip_check: z.boolean().default(true),

    /**
     * Python version(s) to test against.
     * If not specified, the default python version is used.
     */
    python_version: z.string().or(z.array(z.string())).optional(),
  }),
});

export const DownstreamTestElement = z.object({
  /**
   * Install the package and use the output of this package
   * to test if the tests in the downstream package still succeed.
   */
  downstream: z.string(),
});

export const PackageContentTest = z.object({
  /**
   * Test if the package contains the specified files.
   */
  package_contents: z.object({
    /**
     * Files that should be in the package
     */
    files: z.string().or(z.array(z.string())).optional(),

    /**
     * Files that should be in the include/ folder of the package.
     * This folder is found under $PREFIX/include on Unix and
     * $PREFIX/Library/include on Windows.
     */
    include: z.string().or(z.array(z.string())).optional(),

    /**
     * Files that should be in the site-packages/ folder of the package.
     * This folder is found under $PREFIX/lib/pythonX.Y/site-packages on
     * Unix and $PREFIX/Lib/site-packages on Windows.
     */
    site_packages: z.string().or(z.array(z.string())).optional(),

    /**
     * Files that should be in the bin/ folder of the package.
     * This folder is found under $PREFIX/bin on Unix.
     * On Windows this searches for files in %PREFIX, %PREFIX%/bin,
     * %PREFIX%/Scripts, %PREFIX%/Library/bin, %PREFIX/Library/usr/bin
     * and %PREFIX/Library/mingw-w64/bin.
     */
    bin: z.string().or(z.array(z.string())).optional(),

    /**
     * Files that should be in the lib/ folder of the package.
     * This folder is found under $PREFIX/lib on Unix and
     * %PREFIX%/Library/lib on Windows.
     */
    lib: z.string().or(z.array(z.string())).optional(),
  }),
});

export const Test = z.union([
  ScriptTestElement,
  PythonTestElement,
  DownstreamTestElement,
  PackageContentTest,
]);
