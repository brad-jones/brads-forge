import * as fs from "../fs.ts";
import * as path from "@std/path";

export async function gzipFile(src: string, dest: string): Promise<void> {
  const resolvedSrc = await fs.expandGlobFirst(src);
  if (!resolvedSrc) throw new Error(`glob did not match`);

  using input = await Deno.open(resolvedSrc);

  await fs.ensureDir(path.dirname(dest));
  using output = await Deno.create(dest);

  await input.readable
    .pipeThrough(new CompressionStream("gzip"))
    .pipeTo(output.writable);
}

export async function gunzipFile(src: string, dest: string): Promise<void> {
  const resolvedSrc = await fs.expandGlobFirst(src);
  if (!resolvedSrc) throw new Error(`glob did not match`);

  using input = await Deno.open(resolvedSrc);

  await fs.ensureDir(path.dirname(dest));
  using output = await Deno.create(dest);

  await input.readable
    .pipeThrough(new DecompressionStream("gzip"))
    .pipeTo(output.writable);
}
