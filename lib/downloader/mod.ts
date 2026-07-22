import ProgressBar from "@deno-library/progress";
import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";
import ky from "ky";

/**
 * Downloads a file from the given URL to the specified output path.
 *
 * @param url The URL of the file to download.
 * @param outputPath The local path where the file should be saved.
 * @param headers Optional headers to include in the request.
 */
export async function downloadFile(
  url: string,
  outputPath: string,
  headers: Record<string, string> = {},
): Promise<void> {
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
      display: `Downloading ${url} :percent :bar :time :completed/:total`,
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
