import { Digest, DigestAlgorithmName } from "./digest.ts";
import { getDenoAuthHeaders } from "lib/auth/mod.ts";
import ky from "https://esm.sh/ky@1.0.1#^";

/**
 * Parses the typical checksum file produced by tools like `md5sum` &
 * and the various `sha*sum` CLI tools, for a digest matching the
 * given filename.
 *
 * @param digestAlg The digest algorithm name.
 * @param fileName The filename of the digest to extract from the file.
 * @param txt The entire contents of the checksum file as a string.
 * @returns A new Digest object.
 *
 * @see https://unix.stackexchange.com/questions/23014/is-there-file-format-for-checksums
 */
export function digestFromChecksumTXT(digestAlg: DigestAlgorithmName, fileName: string, txt: string) {
  for (const line of txt.split("\n")) {
    if (line.endsWith(fileName)) {
      return new Digest([digestAlg, line.split(" ")[0].trim()]);
    }
  }
  throw new Error(`failed to locate ${fileName} in digest txt`);
}

/**
 * Does the same as `digestFromChecksumTXT` but will read the checksum file for you.
 *
 * @param digestAlg The digest algorithm name.
 * @param fileName The filename of the digest to extract from the file.
 * @param checkSumPath The entire contents of the checksum file as a string.
 * @returns A new Digest object.
 */
export async function digestFromChecksumFile(digestAlg: DigestAlgorithmName, fileName: string, checkSumPath: string) {
  const txt = await Deno.readTextFile(checkSumPath);
  return digestFromChecksumTXT(digestAlg, fileName, txt);
}

/**
 * Does the same as `digestFromChecksumTXT` but will read a remote checksum file for you.
 *
 * @param digestAlg The digest algorithm name.
 * @param fileName The filename of the digest to extract from the file.
 * @param checkSumPath The entire contents of the checksum file as a string.
 * @returns A new Digest object.
 */
export async function digestFromChecksumURL(digestAlg: DigestAlgorithmName, fileName: string, checksumUrl: string) {
  const r = await ky.get(checksumUrl, { redirect: "follow", headers: getDenoAuthHeaders(checksumUrl) });
  return digestFromChecksumTXT(digestAlg, fileName, await r.text());
}
