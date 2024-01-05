import * as fs from "https://deno.land/std@0.211.0/fs/mod.ts#^";
import * as path from "https://deno.land/std@0.211.0/path/mod.ts#^";

export {
  copy,
  detect as detectEOL,
  emptyDir,
  ensureDir,
  ensureFile,
  ensureLink,
  ensureSymlink,
  EOL,
  exists,
  expandGlob,
  move,
  walk as walkFs,
} from "https://deno.land/std@0.211.0/fs/mod.ts#^";
export * as path from "https://deno.land/std@0.211.0/path/mod.ts#^";

export const __filename = (meta: ImportMeta) => path.fromFileUrl(meta.url);

export const __dirname = (meta: ImportMeta) => path.dirname(__filename(meta));

export async function copyGlob(
  src: string,
  dest: string,
  options?: fs.CopyOptions,
) {
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

export async function moveGlob(
  src: string,
  dest: string,
  options?: fs.MoveOptions & { rmEmptyDirs: boolean },
) {
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
