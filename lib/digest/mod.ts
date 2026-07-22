export * from "./checksum.ts";
export * from "./digest.ts";

import ProgressBar from "@deno-library/progress";
import ky from "ky";
import { Digest, DigestAlgorithmName } from "./digest.ts";

/**
 * Fetches the content from the given URL and computes its digest.
 *
 * @param url The URL to fetch the content from.
 * @param a The digest algorithm to use. Defaults to SHA-256.
 * @returns The computed digest as a string.
 */
export async function digestFromUrl(url: string, a?: DigestAlgorithmName): Promise<string> {
  const response = await ky.get(url);
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
      display: `Hashing ${url} :percent :bar :time :completed/:total`,
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

    const digest = await Digest.fromBuffer(response.body.pipeThrough(progressStream), a);
    return digest.hashString;
  } else {
    // No content length, just hash without progress
    return (await Digest.fromBuffer(response.body, a)).hashString;
  }
}
