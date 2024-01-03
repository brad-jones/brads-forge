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
}
