import { crypto } from "https://deno.land/std@0.210.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.210.0/encoding/hex.ts";
import * as path from "https://deno.land/std@0.210.0/path/mod.ts";
import * as semver from "https://deno.land/std@0.210.0/semver/mod.ts";
import { exec } from "https://deno.land/x/denoexec@v1.1.5/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import ky from "https://esm.sh/ky@1.0.1";
import { Platform } from "lib/mod.ts";

const PREFIX_DEV_GQL_ENDPOINT = Deno.env.get("PREFIX_DEV_GQL_ENDPOINT") ??
  `https://prefix.dev/api/graphql`;

const PREFIX_DEV_REST_ENDPOINT = Deno.env.get("PREFIX_DEV_REST_ENDPOINT") ??
  `https://prefix.dev/api/v1`;

const PREFIX_DEV_TOKEN = Deno.env.get("PREFIX_DEV_TOKEN") ?? "";

const PREFIX_DEV_CHANNEL = Deno.env.get("PREFIX_DEV_CHANNEL") ?? "brads-forge";

/**
 * Uploads a package to prefix.dev (using curl).
 *
 * There are several other strategies coded up but commented out below.
 * First we just went straight for a ky client, that didn't work,
 * tried vanilla fetch next, still didn't work.
 *
 * Turns out Deno have blocked the user from setting he Content-Length header.
 * @see: https://github.com/denoland/deno/pull/15555
 *
 * So then I tried Axios & that did work because it used the node compat. layer
 * that Deno has these days. Which obviously doesn't use the exact same Rust
 * code that fetch uses under the hood.
 *
 * But it kinda sucks because I had to add all these node things.
 * Also couldn't really get upload progress to work I suspect due to
 * the way the toNodeReadable converter thing works.
 *
 * So then I tired `pixi upload`, that worked but still no progress output.
 * Did the same with the new `rattler-build upload pixi` command, same outcome,
 * successfully published but no progress output.
 *
 * And so this is why we are shelling out to curl. It gets the Content-Length
 * correct all by it's self, outputs a nice progress bar. The only thing it
 * doesn't do is the sha256 digest but hey who can complain :)
 */
export const pkgUpload = async (filePath: string) => {
  const reader = (await Deno.open(filePath)).readable;
  const fileDigest = encodeHex(await crypto.subtle.digest("SHA-256", reader));

  // dprint-ignore
  await exec({
    cmd: [
      "curl", "-X", "POST", "--progress-bar",
      "--data-binary", `@${filePath}`,
      "-H", `Authorization: Bearer ${PREFIX_DEV_TOKEN}`,
      "-H", `X-File-Name: ${path.basename(filePath)}`,
      "-H", `X-File-SHA256: ${fileDigest}`,
      "-H", `Content-Type: application/octet-stream`,
      `${PREFIX_DEV_REST_ENDPOINT}/upload/${PREFIX_DEV_CHANNEL}`,
    ],
  });
};

/*
export const pkgUpload = (filePath: string) =>
  _`rattler-build upload prefix -c ${PREFIX_DEV_CHANNEL} -a ${PREFIX_DEV_TOKEN} ${filePath}`;

export const pkgUpload = (filePath: string) =>
  _`pixi upload ${`${PREFIX_DEV_REST_ENDPOINT}/upload/${PREFIX_DEV_CHANNEL}`} ${filePath}`;

export const pkgUpload = (filePath: string) =>
  goDefer(async (defer) => {
    const file = await Deno.open(filePath);
    defer(() => file.close());

    const fileSize = (await file.stat()).size;
    const fileName = path.basename(filePath);
    const [digestR, uploadR] = file.readable.tee();
    const fileDigest = encodeHex(
      await crypto.subtle.digest("SHA-256", digestR),
    );

    console.log({ uploading: { fileName, fileDigest, fileSize } });

    // We are using axios to workaround the fact that the Deno fetch client
    // will not allow us to send the content-length header. Axios uses the
    // node compat. layer which seems unaffected.
    //
    // see: https://github.com/denoland/deno/pull/15555
    const [err] = await radash.try(axios.post)(
      `${PREFIX_DEV_REST_ENDPOINT}/upload/${PREFIX_DEV_CHANNEL}`,
      toNodeReadable(
        uploadR.pipeThrough(toTransformStream(async function* (src) {
          let uploaded = 0;
          for await (const chunk of src) {
            uploaded = uploaded + chunk.length;
            console.log(`${uploaded}/${fileSize}`);
            yield chunk;
          }
        })),
      ),
      {
        headers: {
          "Authorization": `Bearer ${PREFIX_DEV_TOKEN}`,
          "X-File-Name": fileName,
          "X-File-SHA256": fileDigest,
          "Content-Length": fileSize,
          "Content-Type": "application/octet-stream",
        },
      },
    );
    if (err) {
      if (err instanceof AxiosError) {
        throw new Error(
          `${err.response?.status}: ${err.response?.statusText} - ${err.response?.data}`,
        );
      }
      throw err;
    }
  });
*/

export const pkgExists = async (
  name: string,
  version: semver.SemVer,
  platform: Platform,
) =>
  z.object({ // this is a super neat pattern for the like of Zod / Valibot.
    data: z.object({
      package: z.object({
        variants: z.object({
          page: z.array(z.object({
            platform: z.string(),
            version: z.string(),
          })),
        }),
      }),
    }),
  }).parse(
    await ky.post(PREFIX_DEV_GQL_ENDPOINT, {
      headers: {
        "Authorization": `Bearer ${PREFIX_DEV_TOKEN}`,
      },
      json: {
        query: `{
        package(channelName: "${PREFIX_DEV_CHANNEL}", name: "${name}") {
          variants(limit: 100) {
            page {
              platform
              version
            }
          }
        }
      }`,
      },
    }).json(),
  ).data.package.variants.page.filter((_) =>
    _.version === semver.format(version) &&
    _.platform === platform
  ).length === 1;
