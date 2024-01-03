import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { OptionalStringList } from "./utils.ts";

export type Requirements = z.infer<typeof Requirements>;

export const Requirements = z.strictObject({
  /**
   * Dependencies to install on the build platform architecture.
   * Compilers, CMake, everything that needs to execute at build time.
   */
  build: OptionalStringList,

  /**
   * Dependencies to install on the host platform architecture.
   * All the packages that your build links against.
   */
  host: OptionalStringList,

  /**
   * Dependencies that should be installed alongside this package.
   *
   * Dependencies in the 'host' section with 'run_exports' are also
   * automatically added here.
   */
  run: OptionalStringList,

  /**
   * Constrained optional dependencies at runtime.
   */
  runConstrained: OptionalStringList,
});
