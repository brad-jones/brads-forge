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
    const release = await octokit.repos.getReleaseByTag({
      owner: options.owner,
      repo: options.repo,
      tag,
      headers: options.headers,
    });

    let checkSumFile: string | undefined = undefined;
    let checkSumFileDownloader: (() => Promise<string>) | undefined = undefined;
    const checksumFilePattern = options.checksumFilePattern ?? /^.*(checksum|sha256).*$/;
    const checkSumFileUrl = release.data.assets.find((_) => _.name.match(checksumFilePattern))?.browser_download_url;
    if (checkSumFileUrl && !checkSumFileUrl.endsWith(".sha256")) {
      checkSumFileDownloader = async () => {
        if (!checkSumFile) {
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
        return checkSumFile;
      };
    }

    for (const asset of release.data.assets) {
      if (asset.browser_download_url.endsWith(".sha256")) continue;

      const os = allOperatingSystems.find((os) =>
        asset.name.includes(
          options.osMap ? options.osMap[os] ?? os : os,
        )
      );
      if (!os || os === "unknown") continue;

      let arch = allArchitectures.find((arch) =>
        asset.name.includes(
          options.archMap ? options.archMap[arch] ?? arch : arch,
        )
      );
      if (!arch || arch === "unknown") continue;

      // NB: There is no such platform variant as linux-arm64
      // Instead you probably want linux-aarch64 or linux-armv6l, linux-armv7l.
      // https://stackoverflow.com/questions/31851611/differences-between-arm64-and-aarch64
      if (os === "linux" && arch === "arm64") arch = "aarch64";
      if (os === "osx" && arch === "aarch64") arch = "arm64";
      if (os === "win" && arch === "aarch64") arch = "arm64";

      sources[Platform.parse(`${os}-${arch}`)] = {
        url: asset.browser_download_url,
        sha256: async () => {
          if (checkSumFileDownloader) {
            return digestFromChecksumTXT("SHA-256", asset.name, await checkSumFileDownloader()).digestPair[1];
          } else {
            const checksumFile = release.data.assets.find((_) => _.name.endsWith(`${asset.name}.sha256`));
            if (checksumFile) {
              const digestFileTxt = await ky.get(checksumFile.browser_download_url).text();
              try {
                return digestFromChecksumTXT("SHA-256", asset.name, digestFileTxt).digestPair[1];
              } catch (_) {
                return digestFileTxt;
              }
            } else {
              console.log(`Downloading ${asset.name} to calc missing digest...`);
              const r = await ky.get(asset.browser_download_url);
              if (!r.body) throw new Error(`failed to download asset to calculate digest`);
              return (await Digest.fromBuffer(r.body)).digestPair[1];
            }
          }
        },
      };
    }

    return sources;
  };
}
