import type { XOR } from "npm:ts-xor@1.3.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const BaseSource = z.strictObject({
  /**
   * Patches may optionally be applied to the source.
   * A path relative to the recipe file.
   */
  patches: z.array(z.string()).default([]).optional(),

  /**
   * Within boa's work directory, you may specify a particular folder to place source into.
   * Boa will always drop you into the same folder (build folder/work), but it's up to you
   * whether you want your source extracted into that folder, or nested deeper.
   * This feature is particularly useful when dealing with multiple sources,
   * but can apply to recipes with single sources as well.
   */
  folder: z.string().optional(),
});

const LocalSource = BaseSource.extend({
  /**
   * A path on the local machine that contains the source.
   */
  path: z.string(),

  /**
   * By default, all files in the local path that are ignored
   * by git are also ignored by rattler-build.
   */
  useGitignore: z.boolean().default(true).optional(),
});

const HttpSource = BaseSource.extend({
  /**
   * The url that points to the source.
   * This should be an archive that is extracted in the working directory.
   */
  url: z.string().url(),

  /**
   * The SHA256 hash of the source archive.
   */
  sha256: z.string().optional(),

  /**
   * The MD5 hash of the source archive.
   */
  md5: z.string().optional(),
}).refine(
  (i) =>
    [i.sha256, i.md5]
      .filter((v) => typeof v !== "undefined" && v !== null)
      .length !== 1,
  `
    The properties 'sha256' & 'md5' are mutually exclusive,
    you must provide at most one value.
  `,
);

const GitSource = BaseSource.extend({
  /**
   * The url that points to the git repository.
   */
  gitUrl: z.string(),

  /**
   * The git rev the checkout.
   */
  gitRev: z.string().default("HEAD").optional(),

  /**
   * A value to use when shallow cloning the repository.
   */
  gitDepth: z.number().int().default(0).optional(),
});

export const Source = z.union([LocalSource, HttpSource, GitSource]);

export type Source = XOR<
  z.infer<typeof LocalSource>,
  z.infer<typeof HttpSource>,
  z.infer<typeof GitSource>
>;
