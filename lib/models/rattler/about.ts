import { z } from "zod";

export const About = z.object({
  /**
   * A short description of the package.
   */
  summary: z.string().optional(),

  /**
   * Extended description of the package or a file (usually a README).
   */
  description: z.string().or(z.object({ file: z.string() })).optional(),

  /**
   * Url of the homepage of the package.
   */
  homepage: z.string().url().optional(),

  /**
   * Url that points to where the source code is hosted e.g. (github.com)
   */
  repository: z.string().url().optional(),

  /**
   * Url that points to where the documentation is hosted.
   */
  documentation: z.string().url().optional(),

  /**
   * An license in SPDX format.
   *
   * @see https://spdx.org/licenses/
   */
  license: z.string().optional(),

  /**
   * Path to the license file of this package.
   */
  license_file: z.string().optional(),

  /**
   * A url that points to the license file.
   */
  license_url: z.string().url().optional(),

  prelink_message: z.string().optional(),
});
