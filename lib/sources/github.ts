import { z } from "zod";
import ky from "ky";
import { Octokit } from "@octokit/rest";
import { Source } from "../models/rattler/source.ts";
import { Platform, PlatformOs, PlatformArch, allOperatingSystems, allArchitectures } from "../models/platform.ts";
import { Digest, digestFromChecksumTXT } from "../digest/mod.ts";

const token = Deno.env.get("GH_TOKEN") ??
  Deno.env.get("GITHUB_TOKEN") ??
  Deno.env.get("GITHUB_API_TOKEN");

const OCTOKIT = new Octokit({ auth: token });

export interface Options {
  owner: string;
  repo: string;
  osMap?: Partial<Record<PlatformOs, string>>;
  archMap?: Partial<Record<PlatformArch, string>>;
  checksumFilePattern?: RegExp;
  headers?: Record<string, string>;
}

export function githubReleaseAssets(options: Options, octokit = OCTOKIT) {
  return async (tag: string): Promise<Partial<Record<Platform, z.output<typeof Source>>>> => {
    const sources: Partial<Record<Platform, z.output<typeof Source>>> = {};
    console.log(`Finding github release assets for ${options.owner}/${options.repo}@${tag}`);
    const release = await octokit.repos.getReleaseByTag({ ...options, tag });

    let checkSumFile: string | undefined = undefined;
    const checksumFilePattern = options.checksumFilePattern ?? /^.*(checksum|sha256).*$/;
    const checkSumFileUrl = release.data.assets.find((_) => _.name.match(checksumFilePattern))?.browser_download_url;
    if (checkSumFileUrl) {
      console.log(`Downloading checksum file ${checkSumFileUrl}`);
      checkSumFile = await ky.get(checkSumFileUrl, {
        redirect: "follow",
        headers: token
          ? {
            "Authorization": `Bearer ${token}`,
            ...options.headers,
          }
          : { ...options.headers },
      }).text();
    }

    for (const asset of release.data.assets) {
      const os = allOperatingSystems.find((os) =>
        asset.name.includes(
          options.osMap ? options.osMap[os] ?? os : os,
        )
      );
      if (!os) continue;

      let arch = allArchitectures.find((arch) =>
        asset.name.includes(
          options.archMap ? options.archMap[arch] ?? arch : arch,
        )
      );
      if (!arch) continue;

      // NB: There is no such platform variant as linux-arm64
      // Instead you probably want linux-aarch64 or linux-armv6l, linux-armv7l.
      // https://stackoverflow.com/questions/31851611/differences-between-arm64-and-aarch64
      if (os === "linux" && arch === "arm64") {
        arch = "aarch64";
      }

      // Similarly there is no such platform as osx-aarch64
      if (os === "osx" && arch === "aarch64") {
        arch = "arm64";
      }

      let digest: string;
      if (checkSumFile) {
        digest = digestFromChecksumTXT("SHA-256", asset.name, checkSumFile).digestPair[1];
      } else {
        console.log(`Downloading ${asset.name} to calc missing digest...`);
        const r = await ky.get(asset.browser_download_url);
        if (!r.body) throw new Error(`failed to download asset to calculate digest`);
        digest = (await Digest.fromBuffer(r.body)).digestPair[1];
      }

      sources[Platform.parse(`${os}-${arch}`)] = {
        url: asset.browser_download_url,
        sha256: digest,
      };
    }

    return sources;
  };
}
