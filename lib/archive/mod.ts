import * as fs from "../fs.ts";
import * as path from "@std/path";
import { ZipReader } from "@zip-js/zip-js";

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

export async function extractZip(zipPath: string, outputDir: string): Promise<void> {
  const zipReader = new ZipReader((await Deno.open(zipPath)).readable);
  const entries = await zipReader.getEntries();

  for (const entry of entries) {
    if (!entry.directory) {
      const outputPath = path.join(outputDir, entry.filename);
      await fs.ensureDir(path.dirname(outputPath));
      const outputFile = await Deno.open(outputPath, { create: true, truncate: true, write: true });
      await entry.getData(outputFile.writable);
      try {
        outputFile.close();
      } catch {
        // swallow already closed error
      }
    }
  }

  await zipReader.close();
}
