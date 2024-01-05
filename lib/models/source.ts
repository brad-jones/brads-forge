import { Digest } from "lib/mod.ts";
import type { XOR } from "npm:ts-xor@1.3.0";

// see: https://github.com/prefix-dev/rattler-build/blob/main/src/recipe/parser/source.rs

export interface BaseSource {
  /**
   * Patches may optionally be applied to the source. A path relative to the recipe file.
   */
  patches?: string[];

  /**
   * Within boa's work directory, you may specify a particular folder to place source into.
   * Boa will always drop you into the same folder (build folder/work), but it's up to you
   * whether you want your source extracted into that folder, or nested deeper.
   * This feature is particularly useful when dealing with multiple sources,
   * but can apply to recipes with single sources as well.
   */
  folder?: string;
}

export interface LocalSource extends BaseSource {
  /**
   * A path on the local machine that contains the source.
   */
  path: string;

  /**
   * Optionally a file name to rename the downloaded file (does not apply to archives)
   */
  fileName?: string;

  /**
   * By default, all files in the local path that are ignored
   * by git are also ignored by rattler-build.
   */
  useGitIgnore?: boolean;
}

export interface UrlSource extends BaseSource {
  /**
   * The url that points to the source.
   * This should be an archive that is extracted in the working directory.
   */
  url: string;

  /**
   * The hash of the downloaded file.
   */
  hash: Digest;

  /**
   * Optionally a file name to rename the downloaded file (does not apply to archives)
   */
  fileName?: string;
}

export interface GitSource extends BaseSource {
  /**
   * The url that points to the git repository.
   */
  gitUrl: string;

  /**
   * The git rev the checkout.
   */
  gitRev?: string;

  /**
   * A value to use when shallow cloning the repository.
   *
   * Defaults to -1/not shallow
   */
  gitDepth?: number;

  /**
   * defaults to false
   */
  lfs?: boolean;
}

export type Source = XOR<LocalSource, UrlSource, GitSource>;
