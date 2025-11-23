import { z } from "zod";
import { Script } from "./script.ts";
import { GlobDict } from "./glob_dict.ts";

export const Build = z.object({
  /**
   * Build number to version current build in addition to package version
   */
  number: z.number().int().default(0),

  /**
   * The build string to identify build variant.
   * This is usually omitted (can use ${{ hash }}) variable here)
   */
  string: z.string().optional(),

  /**
   * List of conditions under which to skip the build of the package.
   * If any of these condition returns true the build is skipped.
   */
  skip: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),

  /**
   * Can be either 'generic' or 'python'.
   * A noarch 'python' package compiles .pyc files upon installation.
   */
  noarch: z.enum(["generic", "python"]).optional(),

  /**
   * The script to execute to invoke the build.
   * If the string is a single line and ends with
   * .sh or .bat, then we interpret it as a file.
   */
  script: z.union([z.string(), Script, z.array(z.union([z.string(), Script]))]).optional(),

  /**
   * Merge the build and host environments (used in many R packages on Windows)
   */
  merge_build_and_host_envs: z.boolean().optional(),

  /**
   * Files to be included even if they are present in the PREFIX before building.
   */
  always_include_files: z.union([z.string(), GlobDict, z.tuple([z.string(), GlobDict])]).optional(),

  /**
   * Do not soft- or hard-link these files but instead always copy them into the environment
   */
  always_copy_files: z.union([z.string(), GlobDict, z.tuple([z.string(), GlobDict])]).optional(),

  /**
   * Options that influence how the different variants are computed.
   */
  variant: z.object({
    /**
     * Keys to forcibly use for the variant computation (even if they are not in the dependencies)
     */
    use_keys: z.union([z.string(), z.array(z.string())]).optional(),

    /**
     * Keys to forcibly ignore for the variant computation (even if they are in the dependencies)
     */
    ignore_keys: z.union([z.string(), z.array(z.string())]).optional(),

    /**
     * Used to prefer this variant less over other variants
     */
    down_prioritize_variant: z.number().int().default(0),
  }).optional(),

  /**
   * Python specific build configuration
   */
  python: z.object({
    /**
     * Specifies if python.app should be used as the entrypoint on macOS. (macOS only)
     */
    use_python_app_entrypoint: z.boolean().default(false),

    /**
     * Skip compiling pyc for some files
     */
    skip_pyc_compilation: z.union([z.string(), GlobDict, z.tuple([z.string(), GlobDict])]).optional(),

    /**
     * The path to the site-packages folder.
     *
     * This is advertised by Python to install noarch packages
     * in the correct location. Only valid for a Python package.
     */
    site_packages_path: z.string().optional(),

    entry_points: z.union([z.string(), z.array(z.string())]).optional(),
    preserve_egg_dir: z.boolean().default(false),
    disable_pip: z.boolean().default(false),
  }).optional(),

  /**
   * Configuration to post-process dynamically linked libraries and executables
   */
  dynamic_linking: z.object({
    /**
     * linux only, list of rpaths (was rpath)
     */
    rpaths: z.string().or(z.array(z.string())).optional(),

    /**
     * Whether to relocate binaries or not.
     * If this is a list of paths then only the listed paths are relocated.
     */
    binary_relocation: z.union([
      z.boolean(),
      z.string(),
      GlobDict,
      z.array(z.union([z.string(), GlobDict])),
    ]).default(true),

    /**
     * Allow linking against libraries that are not in the run requirements.
     */
    missing_dso_allowlist: z.union([z.string(), GlobDict, z.tuple([z.string(), GlobDict])]).optional(),

    /**
     * Allow runpath/rpath to point to these locations outside of the environment
     */
    rpath_allowlist: z.union([z.string(), GlobDict, z.tuple([z.string(), GlobDict])]).optional(),

    /**
     * What to do when detecting overdepending.
     *
     * Overdepending means that a requirement a run requirement is specified
     * but none of the artifacts from the build link against any of the shared
     * libraries of the requirement.
     */
    overdepending_behavior: z.enum(["ignore", "error"]).default("error"),

    /**
     * What to do when detecting overlinking.
     *
     * Overlinking occurs when an artifact links against a library
     * that was not specified in the run requirements.
     */
    overlinking_behavior: z.enum(["ignore", "error"]).default("error"),
  }).optional(),

  /**
   * Options that influence how a package behaves when it is installed or uninstalled.
   */
  link_options: z.object({
    /**
     * Script to execute after the package has been linked into an environment
     */
    post_link_script: z.string().optional(),

    /**
     * Script to execute before uninstalling the package from an environment
     */
    pre_unlink_script: z.string().optional(),

    /**
     * Message to show before linking
     */
    pre_link_message: z.string().optional(),
  }).optional(),

  /**
   * Options that influence how the prefix replacement is done.
   */
  prefix_detection: z.object({
    /**
     * force the file type of the given files to be TEXT or BINARY
     */
    force_file_type: z.object({
      /**
       * force TEXT file type
       */
      text: z.union([z.string(), GlobDict, z.tuple([z.string(), GlobDict])]).optional(),

      /**
       * force BINARY file type
       */
      binary: z.union([z.string(), GlobDict, z.tuple([z.string(), GlobDict])]).optional(),
    }).optional(),

    /**
     * Ignore all or specific files for prefix replacement
     */
    ignore: z.union([z.boolean(), z.string(), z.array(z.string())]).default(false),

    /**
     * Whether to detect binary files with prefix or not
     */
    ignore_binary_files: z.union([z.boolean(), z.string(), z.array(z.string())]).default(false),
  }).optional(),

  /**
   * Glob patterns to include or exclude files from the package.
   */
  files: z.union([z.string(), GlobDict, z.tuple([z.string(), GlobDict])]).optional(),
});
