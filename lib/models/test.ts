import { z } from "zod";
import { BuildContext } from "./build.ts";

export const FuncTest = z.object({
  /**
   * Instead of brittle bash/powershell scripts just write your tests using TypeScript.
   */
  func: z.function()
    .args(BuildContext)
    .returns(z.promise(z.void()))
    .optional(),

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
