import { z } from "zod";

export const IgnoreRunExports = z.object({
  /**
   * Ignore run exports by name (e.g. libgcc-ng)
   */
  by_name: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * Ignore run exports that come from the specified packages
   */
  from_package: z.union([z.string(), z.array(z.string())]).optional(),
});
