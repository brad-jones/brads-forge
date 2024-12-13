import { Platform } from "lib/models/platform.ts";
import ky from "ky";
import { z } from "zod";

const DEFAULT_CHANNEL = Deno.env.get("PREFIX_DEV_CHANNEL") ?? "brads-forge";

export interface Variant {
  name: string;
  version: string;
  platform: Platform;
  buildNo?: number;
  buildString?: string;
  channel?: string;
}

export interface Package {
  filename: string;
  platform: Platform;
  channel?: string;
}

export class PrefixClient {
  #token: string;
  #restBaseUrl: string;
  #gqlBaseUrl: string;

  constructor({ token, restBaseUrl, gqlBaseUrl }: { token?: string; restBaseUrl?: string; gqlBaseUrl?: string } = {}) {
    this.#token = token ?? Deno.env.get("PREFIX_TOKEN") ?? "";
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
   * Queries the prefix.dev GraphQL API to determin if the given variant is published or not.
   *
   * @param n Name of the conda package to check for existence.
   * @param v Version of the variant to check for existence.
   * @param p Platform of the variant to check for existence.
   * @param bN Build number of the variant to check for existence.
   * @param c The channel where the package can be found.
   *
   * @returns `true` if the variant exists, `false` otherwise.
   */
  async variantExists({ name, version, platform, buildNo = 0, channel = DEFAULT_CHANNEL }: Variant) {
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
              buildNumber: z.number(),
            })),
          }),
        }).nullable(),
      }),
    });

    while (true) {
      const response = await ky.post(this.#gqlBaseUrl, {
        headers: { "Authorization": `Bearer ${this.#token}` },
        json: {
          query: `{
              package(channelName: "${channel}", name: "${name}") {
                variants(limit: 100, page: ${page}) {
                  current
                  pages
                  page {
                    platform
                    version
                    buildNumber
                  }
                }
              }
            }`,
        },
      }).json();

      const pkg = pkgExistsSchema.parse(response).data.package;
      if (!pkg) return false;

      if (
        pkg.variants.page.filter((_) =>
          _.version === version &&
          _.platform === platform &&
          _.buildNumber === buildNo
        ).length === 1
      ) {
        return true;
      }

      if (pkg.variants.current === pkg.variants.pages - 1) {
        return false;
      }

      page++;
    }
  }

  async deletePackage({ filename, platform, channel = DEFAULT_CHANNEL }: Package) {
    await ky.delete(`${this.#restBaseUrl}/delete/${channel}/${platform}/${filename}`, {
      headers: { "Authorization": `Bearer ${Deno.env.get("PREFIX_TOKEN")}` },
      timeout: 120 * 1000,
    });
  }
}
