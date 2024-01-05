// see: https://github.com/prefix-dev/rattler-build/blob/main/src/recipe/parser/requirements.rs

export interface Requirements {
  /**
   * Dependencies to install on the build platform architecture.
   * Compilers, CMake, everything that needs to execute at build time.
   */
  build?: string | string[];

  /**
   * Dependencies to install on the host platform architecture.
   * All the packages that your build links against.
   */
  host?: string | string[];

  /**
   * Dependencies that should be installed alongside this package.
   *
   * Dependencies in the 'host' section with 'run_exports' are also
   * automatically added here.
   */
  run?: string | string[];

  /**
   * Constrained optional dependencies at runtime.
   */
  runConstrained?: string | string[];

  /**
   * The recipe can specify a list of run exports that it provides.
   */
  runExports?: {
    /**
     * Noarch run exports are the only ones looked at when building noarch packages.
     */
    noarch?: string | string[];

    /**
     * Strong run exports apply from the build and host env to the run env.
     */
    strong?: string | string[];

    /**
     * Strong run constrains add run_constrains from the build and host env.
     */
    strongConstrains?: string | string[];

    /**
     * Weak run exports apply from the host env to the run env.
     */
    weak?: string | string[];

    /**
     * Weak run constrains add run_constrains from the host env.
     */
    weakConstrains?: string | string[];
  };

  /**
   * Ignore run-exports by name or from certain packages
   */
  ignoreRunExports?: {
    byName: any;
    fromPackage: any;
  };
}
