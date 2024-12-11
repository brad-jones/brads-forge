import { z } from "zod";

export const RunExports = z.object({
  /**
   * Weak run exports apply from the host env to the run env
   */
  weak: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * Strong run exports apply from the build and host env to the run env
   */
  strong: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * Noarch run exports are the only ones looked at when building noarch packages
   */
  noarch: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * Weak run constraints add run_constraints from the host env
   */
  weak_constraints: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * Strong run constraints add run_constraints from the build and host env
   */
  strong_constraints: z.union([z.string(), z.array(z.string())]).optional(),
});
