import { Digest } from "lib/digest/mod.ts";
import { Platform } from "lib/models/mod.ts";
import ky from "https://esm.sh/ky@1.0.1#^";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { exec } from "https://deno.land/x/denoexec@v1.1.5/mod.ts";
import * as path from "https://deno.land/std@0.211.0/path/mod.ts";
import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts";

const DEFAULT_CHANNEL = Deno.env.get("PREFIX_DEV_CHANNEL") ?? "brads-forge";

export class PrefixClient {
  #token: string;
  #restBaseUrl: string;
  #gqlBaseUrl: string;

  constructor({ token, restBaseUrl, gqlBaseUrl }: { token?: string; restBaseUrl?: string; gqlBaseUrl?: string } = {}) {
    this.#token = token ?? Deno.env.get("PREFIX_DEV_TOKEN") ?? "";
    if (this.#token === "") {
      throw new Error("token is empty");
    }

    this.#restBaseUrl = restBaseUrl ??
      Deno.env.get("PREFIX_DEV_REST_ENDPOINT") ??
      `https://prefix.dev/api/v1`;

    this.#gqlBaseUrl = gqlBaseUrl ??
      Deno.env.get("PREFIX_DEV_REST_ENDPOINT") ??
      `https://prefix.dev/api/graphql`;
  }

  /**
   * Uploads a package to prefix.dev.
   *
   * @param filePath The path to a built conda package to upload to prefix.dev.
   * @param channel The name of the channel to upload it to.
   *
   * NB: Why do we shell out to curl?
   *
   * Several other strategies where attempted, go back in time with Git to see those.
   * @see: https://github.com/brad-jones/brads-forge/blob/73678cc29dcad7ea58c3f279a4e2e8604e5713c0/lib/prefixClient.ts#L64-L121
   *
   * First we just went straight for a ky client, that didn't work,
   * tried vanilla fetch next, still didn't work.
   *
   * Turns out Deno have blocked the user from setting the Content-Length header.
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
  public async pkgUpload(filePath: string, channel = DEFAULT_CHANNEL) {
    // dprint-ignore
    await exec({
      cmd: [
        "curl", "-X", "POST", "--progress-bar",
        "--data-binary", `@${filePath}`,
        "-H", `Authorization: Bearer ${this.#token}`,
        "-H", `X-File-Name: ${path.basename(filePath)}`,
        "-H", `X-File-SHA256: ${(await Digest.fromFile(filePath)).hashString}`,
        "-H", `Content-Type: application/octet-stream`,
        `${this.#restBaseUrl}/upload/${channel}`,
      ],
    });
  }

  /**
   * Queries the prefix.dev GraphQL API to determin if the given variant is published or not.
   *
   * @param n Name of the conda package to check for existence.
   * @param v Version of the variant to check for existence.
   * @param p Platform of the variant to check for existence.
   * @param c The channel where the package can be found.
   *
   * @returns `true` if the variant exists, `false` otherwise.
   */
  public async variantExists({ n, v, p, c = DEFAULT_CHANNEL }: {
    n: string;
    v: semver.SemVer;
    p: Platform;
    c?: string;
  }) {
    let page = 0;

    const pkgExistsSchema = z.object({
      data: z.object({
        package: z.object({
          variants: z.object({
            current: z.number(),
            pages: z.number(),
            page: z.array(z.object({
              platform: z.string(),
              version: z.string(),
            })),
          }),
        }),
      }),
    });

    while (true) {
      const variants = pkgExistsSchema.parse(
        await ky.post(this.#gqlBaseUrl, {
          headers: { "Authorization": `Bearer ${this.#token}` },
          json: {
            query: `{
              package(channelName: "${c}", name: "${n}") {
                variants(limit: 100, page: ${page}) {
                  current
                  pages
                  page {
                    platform
                    version
                  }
                }
              }
            }`,
          },
        }).json(),
      ).data.package.variants;

      if (
        variants.page.filter((_) =>
          _.version === semver.format(v) &&
          _.platform === p
        ).length === 1
      ) {
        return true;
      }

      if (variants.current === variants.pages - 1) {
        return false;
      }

      page++;
    }
  }
}
