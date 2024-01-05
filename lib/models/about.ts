// see: https://github.com/prefix-dev/rattler-build/blob/main/src/recipe/parser/about.rs

export interface About {
  /**
   * Url of the homepage of the package.
   */
  homepage?: string;

  /**
   * Url that points to where the source code is hosted e.g. (github.com)
   */
  repository?: string;

  /**
   * Url that points to where the documentation is hosted.
   */
  documentation?: string;

  /**
   * An license in SPDX format.
   */
  license?: string;

  /**
   * Paths to the license files of this package.
   */
  licenseFile?: string | string[];

  /**
   * A url that points to the license file.
   */
  licenseUrl?: string;

  /**
   * A short description of the package.
   */
  summary?: string;

  /**
   * Extended description of the package or a file (usually a README).
   */
  description?: string | { file: string };

  prelinkMessage?: string;
}
