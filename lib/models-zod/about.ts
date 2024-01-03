import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { OptionalUrl, PathNoBackslash } from "./utils.ts";

export type About = z.infer<typeof About>;

export const About = z.strictObject({
  /**
   * Url of the homepage of the package.
   */
  homepage: OptionalUrl,

  /**
   * Url that points to where the source code is hosted e.g. (github.com)
   */
  repository: OptionalUrl,

  /**
   * Url that points to where the documentation is hosted.
   */
  documentation: OptionalUrl,

  /**
   * An license in SPDX format.
   */
  license: z.string().optional(),

  /**
   * Paths to the license files of this package.
   */
  licenseFile: z.union([PathNoBackslash, z.array(PathNoBackslash)]).optional(),

  /**
   * A url that points to the license file.
   */
  licenseUrl: OptionalUrl,

  /**
   * A short description of the package.
   */
  summary: z.string().optional(),

  /**
   * Extended description of the package or a file (usually a README).
   */
  description: z.union([z.string(), z.strictObject({ file: PathNoBackslash })])
    .optional(),

  prelinkMessage: z.string().optional(),
});
