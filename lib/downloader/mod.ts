import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";
import ProgressBar from "@deno-library/progress";
import ky from "ky";

export async function downloadFile(
  url: string,
  outputPath: string,
  headers: Record<string, string> = {},
): Promise<void> {
  console.log(`Downloading ${url}`);
  await ensureDir(dirname(outputPath));
  const response = await ky.get(url, { headers });
  if (!response.body) throw new Error("missing body");

  // Get content length for progress tracking
  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (total > 0) {
    // Create progress bar
    const progressBar = new ProgressBar({
      total,
      complete: "=",
      incomplete: "-",
      display: ":percent :bar :time :completed/:total",
    });

    // Create a transform stream to track progress
    let loaded = 0;
    const progressStream = new TransformStream({
      transform(chunk, controller) {
        loaded += chunk.byteLength;
        progressBar.render(loaded);
        controller.enqueue(chunk);
      },
    });

    // Pipe through progress tracker to file
    await response.body
      .pipeThrough(progressStream)
      .pipeTo((await Deno.open(outputPath, { create: true, write: true, truncate: true })).writable);
  } else {
    // No content length, just download without progress
    await response.body.pipeTo((await Deno.open(outputPath, { create: true, write: true, truncate: true })).writable);
  }
}
