export * from "./checksum.ts";
export * from "./digest.ts";

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
  return (await Digest.fromBuffer(await (await ky.get(url)).bytes(), a)).hashString;
}
