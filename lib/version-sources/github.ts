import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";
import { Octokit } from "https://esm.sh/@octokit/rest@20.0.2#^";
import {
  Digest,
  getDigestFromURL,
  PlatformArch,
  PlatformOs,
  radash,
  suffixExe,
} from "lib/mod.ts";

const octokit = new Octokit({
  auth: Deno.env.get("GH_TOKEN") ??
    Deno.env.get("GITHUB_TOKEN") ??
    Deno.env.get("GITHUB_API_TOKEN"),
});

export const ghTags = (owner: string, repo: string) => () =>
  octokit.repos.listTags({ owner, repo })
    .then((_) => _.data.map((_) => semver.parse(_.name)));

export const ghReleases = (owner: string, repo: string) => () =>
  octokit.repos.listReleases({ owner, repo })
    .then((_) => _.data.map((_) => semver.parse(_.name ?? _.tag_name)));

export const ghReleaseUrl = (
  owner: string,
  repo: string,
  version: string,
  filename: string,
) =>
  `https://github.com/${owner}/${repo}/releases/download/${version}/${filename}`;

export const ghReleaseSrc = (
  owner: string,
  repo: string,
  checksumFilename: string,
  filenames: ((
    ctx: {
      version: semver.SemVer;
      targetOs: PlatformOs;
      targetArch: PlatformArch;
      suffixExe: (filename: string) => string;
    },
  ) => string)[],
  checkSumType: Digest[0] = "SHA256",
  vPrefix = "v",
) =>
(version: semver.SemVer, targetOs: PlatformOs, targetArch: PlatformArch) =>
  radash.map(filenames, async (filename) => {
    const v = `${vPrefix}${semver.format(version)}`;
    const fN = filename({
      version,
      targetOs,
      targetArch,
      suffixExe: suffixExe(targetOs),
    });
    return {
      url: ghReleaseUrl(owner, repo, v, fN),
      hash: await getDigestFromURL(
        checkSumType,
        ghReleaseUrl(owner, repo, v, checksumFilename),
        fN,
      ),
    };
  });
