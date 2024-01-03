import type { XOR } from "npm:ts-xor@1.3.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { OptionalStringList } from "./utils.ts";

const CommandTestElement = z.strictObject({
  /**
   * A script to run to perform the test.
   */
  script: z.union([
    z.string(),
    z.array(z.string()),
    z.function().returns(z.union([z.void(), z.promise(z.void())])),
  ]).optional(),

  /**
   * Additional dependencies to install before running the test.
   */
  extraRequirements: z.strictObject(
    {
      /**
       * extra requirements with build_platform architecture (emulators, ...)
       */
      build: OptionalStringList,

      /**
       * extra run dependencies
       */
      run: OptionalStringList,
    },
  ).optional(),

  /**
   * Additional files to include for the test.
   */
  files: z.strictObject(
    {
      /**
       * extra files from $SRC_DIR
       */
      source: OptionalStringList,

      /**
       * extra files from $RECIPE_DIR
       */
      recipe: OptionalStringList,
    },
  ).optional(),
});

const ImportTestElement = z.strictObject({
  /**
   * A list of Python imports to check after having installed the built package.
   */
  imports: z.union([z.string(), z.string()]),
});

const DownstreamTestElement = z.strictObject({
  /**
   * Install the package and use the output of this package to test if
   * the tests in the downstream package still succeed.
   */
  downstream: z.string(),
});

export const Test = z.union([
  CommandTestElement,
  ImportTestElement,
  DownstreamTestElement,
]);

export type Test = XOR<
  z.infer<typeof CommandTestElement>,
  z.infer<typeof ImportTestElement>,
  z.infer<typeof DownstreamTestElement>
>;
