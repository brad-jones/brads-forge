import { z } from "zod";

export const GlobDict = z.object({
  /**
   * Glob patterns to include
   */
  include: z.string().or(z.array(z.string())),

  /**
   * Glob patterns to exclude
   */
  exclude: z.string().or(z.array(z.string())).optional(),
});
