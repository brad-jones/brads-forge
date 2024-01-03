import { tags } from "typia";
import { PathNoBackslash } from "./utils.ts";

export interface About {
  /**
   * Url of the homepage of the package.
   */
  homepage?: string & tags.Format<"url">;

  /**
   * Url that points to where the source code is hosted e.g. (github.com)
   */
  repository?: string & tags.Format<"url">;

  /**
   * Url that points to where the documentation is hosted.
   */
  documentation?: string & tags.Format<"url">;

  /**
   * An license in SPDX format.
   */
  license?: string;

  /**
   * Paths to the license files of this package.
   */
  licenseFile?: PathNoBackslash | PathNoBackslash[];

  /**
   * A url that points to the license file.
   */
  licenseUrl?: string & tags.Format<"url">;

  /**
   * A short description of the package.
   */
  summary?: string;

  /**
   * Extended description of the package or a file (usually a README).
   */
  description?: string | { file: PathNoBackslash };

  prelinkMessage?: string;
}
