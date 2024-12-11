import { z } from "zod";
import { RunExports } from "./run_exports.ts";
import { IgnoreRunExports } from "./ignore_run_exports.ts";

export const Requirements = z.object({
  /**
   * Dependencies to install on the build platform architecture.
   * Compilers, CMake, everything that needs to execute at build time.
   */
  build: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * Dependencies to install on the host platform architecture.
   * All the packages that your build links against.
   */
  host: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * Dependencies that should be installed alongside this package.
   * Dependencies in the host section with run_exports are also automatically added here.
   */
  run: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * Constraints optional dependencies at runtime.
   */
  run_constraints: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * The run exports of this package
   */
  run_exports: z.union([z.string(), z.array(z.string()), RunExports]).optional(),

  /**
   * Ignore run-exports by name or from certain packages
   */
  ignore_run_exports: IgnoreRunExports.optional(),
});
