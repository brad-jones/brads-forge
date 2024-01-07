import * as fs from "https://deno.land/std@0.211.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.211.0/path/mod.ts";

// Re-export a bunch of handy stuff that will be useful in recipes.
export const copy = fs.copy;
export const detectEOL = fs.detect;
export const emptyDir = fs.emptyDir;
export const ensureDir = fs.ensureDir;
export const ensureFile = fs.ensureFile;
export const ensureLink = fs.ensureLink;
export const ensureSymlink = fs.ensureSymlink;
export const EOL = fs.EOL;
export const exists = fs.exists;
export const expandGlob = fs.expandGlob;
export const move = fs.move;
export const walk = fs.walk;

/**
 * Get the path to script you call this in.
 *
 * @example
 * ```ts
 * __filename(import.meta) === './lib/fs.ts'
 * ```
 *
 * @param meta `import.meta` is a global defined by Deno in every module.
 * @returns The absolute path to the currently executing script.
 * @see https://nodejs.org/api/modules.html#__filename
 */
export const __filename = (meta: ImportMeta) => path.fromFileUrl(meta.url);

/**
 * Get the directory that contains the script you call this in.
 *
 * @example
 * ```ts
 * __dirname(import.meta) === './lib'
 * ```
 *
 * @param meta `import.meta` is a global defined by Deno in every module.
 * @returns The absolute path to the directory of the currently executing script.
 * @see https://nodejs.org/api/modules.html#__dirname
 */
export const __dirname = (meta: ImportMeta) => path.dirname(__filename(meta));

export type expandGlobFirstOptions =
  & fs.ExpandGlobOptions
  & { breakOnDirOrFile?: "file" | "dir" };

/**
 * Same as [`expandGlob()`](https://deno.land/std/fs/expand_glob.ts?s=expandGlob)
 * but will return the first match early.
 *
 * @example
 * ```ts
 * const myFile = await expandGlobFirst("myFile*.ts")
 * ```
 */
export async function expandGlobFirst(glob: string | URL, options?: expandGlobFirstOptions) {
  const breakOnDirOrFile = options?.breakOnDirOrFile ?? "file";
  for await (const entry of fs.expandGlob(glob, options)) {
    if (entry.isFile && breakOnDirOrFile === "file") return entry;
    if (entry.isDirectory && breakOnDirOrFile === "dir") return entry;
  }
  return undefined;
}

/**
 * Copies a source glob to a destination path.
 *
 * @param src A glob pattern parsable by `expandGlob`.
 *
 * @param dest If the glob matches multiple paths this must be a directory,
 *             which is denoted by an ending slash, otherwise we assume the
 *             destination is a file.
 *
 * @param options These are passed to the underlying `copy` function.
 *
 * Example: Copying a single file with an unknown name.
 *
 * @example
 * ```ts
 * await copyGlob('/tmp/foo*_abc.tar.gz', './my_tarball.tar.gz');
 * ```
 *
 * Example: Copying multiple files to a new location.
 *
 * @example
 * ```ts
 * await copyGlob('/tmp/*.tar.gz', './my_tarballs/');
 * ```
 */
export async function copyGlob(src: string, dest: string, options?: fs.CopyOptions) {
  const destIsDir = dest.replaceAll("\\", "/").endsWith("/");
  src = path.resolve(src).replaceAll("\\", "/");
  dest = path.resolve(dest).replaceAll("\\", "/");

  const srcPaths: string[] = [];
  for await (const file of fs.expandGlob(src)) {
    if (file.isFile) {
      srcPaths.push(file.path);
    }
  }

  if (srcPaths.length === 0) return;

  if (srcPaths.length === 1 && !destIsDir) {
    await fs.ensureDir(path.dirname(dest));
    await fs.copy(srcPaths[0], dest, options);
    return;
  }

  if (!destIsDir) {
    throw new Error(`can't copy multiple source files into single destination`);
  }

  await Promise.all(
    srcPaths.map(async (s) => {
      const d = path.join(dest, s.replace(path.common([src, s]), ""));
      await fs.ensureDir(path.dirname(d));
      await fs.copy(s, d, options);
    }),
  );
}

/**
 * Moves a source glob to a destination path.
 *
 * @param src A glob pattern parsable by `expandGlob`.
 *
 * @param dest If the glob matches multiple paths this must be a directory,
 *             which is denoted by an ending slash, otherwise we assume the
 *             destination is a file.
 *
 * @param options These are passed to the underlying `move` function.
 *                Although `rmEmptyDirs` is specific to this function.
 *                If set to `true` then any "emptied" directories will
 *                also be deleted (except for the root dir of the glob pattern).
 *
 * Example: Moving a single file with an unknown name.
 *
 * @example
 * ```ts
 * await moveGlob('/tmp/foo*_abc.tar.gz', './my_tarball.tar.gz');
 * ```
 *
 * Example: Moving multiple files to a new location.
 *
 * @example
 * ```ts
 * await moveGlob('/tmp/*.tar.gz', './my_tarballs/');
 * ```
 *
 * Example: Moving multiple files to a new location & cleaning up empty dirs.
 *
 * @example
 * ```ts
 * await moveGlob('/tmp/foo_bar/*.tar.gz', './my_tarballs/', { rmEmptyDirs: true });
 * ```
 *
 * _If `foo_bar` contained more files of any kind then it would also be deleted. But /tmp would remain in place._
 */
export async function moveGlob(src: string, dest: string, options?: fs.MoveOptions & { rmEmptyDirs: boolean }) {
  const destIsDir = dest.replaceAll("\\", "/").endsWith("/");
  src = path.resolve(src).replaceAll("\\", "/");
  dest = path.resolve(dest).replaceAll("\\", "/");

  const srcPaths: string[] = [];
  for await (const file of fs.expandGlob(src)) {
    if (file.isFile) {
      srcPaths.push(file.path);
    }
  }

  if (srcPaths.length === 0) return;

  if (srcPaths.length === 1 && !destIsDir) {
    await fs.ensureDir(path.dirname(dest));
    await fs.move(srcPaths[0], dest, options);
    return;
  }

  if (!destIsDir) {
    throw new Error(`can't copy multiple source files into single destination`);
  }

  await Promise.all(
    srcPaths.map(async (s) => {
      const d = path.join(dest, s.replace(path.common([src, s]), ""));
      await fs.ensureDir(path.dirname(d));
      await fs.move(s, d, options);
      if (options?.rmEmptyDirs) {
        const dirToRm = path.dirname(s);
        try {
          let count = 0;
          for await (const _ of Deno.readDir(dirToRm)) count++;
          if (count === 0) await Deno.remove(dirToRm);
        } catch (e) {
          if (!(e instanceof Deno.errors.NotFound)) throw e;
        }
      }
    }),
  );
}
