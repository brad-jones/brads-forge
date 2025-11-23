import { z } from "zod";

const BaseSource = z.object({
  /**
   * A list of patches to apply after fetching the source
   */
  patches: z.union([z.string(), z.array(z.string())]).optional(),

  /**
   * The location in the working directory to place the source
   */
  target_directory: z.string().optional(),
});

const BaseFileSource = BaseSource.extend({
  /**
   * The SHA256 hash of the source archive
   */
  sha256: z.union([z.string(), z.custom<() => Promise<string>>()]),

  /**
   * A file name to rename the downloaded file to (does not apply to archives).
   */
  file_name: z.string().optional(),
});

const BaseGitSource = BaseSource.extend({
  /**
   * The url that points to the git repository.
   */
  git: z.string(),

  /**
   * Revision to checkout to (hash or ref)
   */
  rev: z.string(),

  /**
   * A value to use when shallow cloning the repository.
   */
  depth: z.number().int().optional(),

  /**
   * Should we LFS files be checked out as well
   */
  lfs: z.boolean().default(false),
});

export const GitRev = BaseGitSource.extend({
  /**
   * Revision to checkout to (hash or ref)
   */
  rev: z.string(),
});

export const GitTag = BaseGitSource.extend({
  /**
   * Tag to checkout
   */
  tag: z.string(),
});

export const GitBranch = BaseGitSource.extend({
  /**
   * Branch to check out
   */
  branch: z.string(),
});

export const UrlSource = BaseFileSource.extend({
  /**
   * Url pointing to the source tar.gz|zip|tar.bz2|...
   * (this can be a list of mirrors that point to the same file)
   */
  url: z.string().url(),
});

export const LocalSource = BaseFileSource.extend({
  /**
   * A path on the local machine that contains the source.
   */
  path: z.string(),

  /**
   * Whether or not to use the .gitignore file when copying the source.
   */
  use_gitignore: z.boolean().default(true),
});

export const Source = z.union([
  UrlSource,
  GitRev,
  GitTag,
  GitBranch,
  BaseGitSource,
  LocalSource,
]);
