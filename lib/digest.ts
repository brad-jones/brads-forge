import ky from "https://esm.sh/ky@1.0.1#^";
import { getDenoAuthHeaders } from "lib/mod.ts";

export type Digest = ["MD5" | "SHA256", string];

export async function getDigestFromURL(
  type: Digest[0],
  remoteChecksumFile: string,
  filename: string,
): Promise<Digest> {
  const r = await ky.get(remoteChecksumFile, {
    redirect: "follow",
    headers: getDenoAuthHeaders(new URL(remoteChecksumFile)),
  });
  return getDigestFromTXT(type, await r.text(), filename);
}

export function getDigestFromTXT(
  type: Digest[0],
  txt: string,
  filename: string,
): Digest {
  for (const line of txt.split("\n")) {
    if (line.endsWith(filename)) {
      return [type, line.split(" ")[0].trim()];
    }
  }
  throw new Error(`failed to locate ${filename} in digest txt`);
}
