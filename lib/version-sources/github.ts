import ky from "https://esm.sh/ky@1.0.1#^";
import * as radash from "https://esm.sh/radash@11.0.0#^";
import { Octokit } from "https://esm.sh/@octokit/rest@20.0.2#^";
import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";

import { DslCtx } from "lib/models/dslctx.ts";
import { getDenoAuthHeaders } from "lib/auth/mod.ts";
import { Digest, DigestAlgorithmName, digestFromChecksumURL } from "lib/digest/mod.ts";

const OCTOKIT = new Octokit({
  auth: Deno.env.get("GH_TOKEN") ??
    Deno.env.get("GITHUB_TOKEN") ??
    Deno.env.get("GITHUB_API_TOKEN"),
});

/**
 * Returns a list of version numbers from a github repo's tags.
 *
 * @param owner The name of the owning org - eg: https://github.com/<OWNER>
 *
 * @param repo The name of the repo - eg: https://github.com/<OWNER>/<REPO>
 *
 * @param octokit We provide a default Octokit client that should work for
 *                most cases but you can override it if you wish.
 *
 * @returns An array of parsed semantic version numbers.
 *
 * NB: This does not page the API, only the first page of tags are parsed.
 */
export const ghTags = (owner: string, repo: string, octokit = OCTOKIT) => () =>
  octokit.repos.listTags({ owner, repo })
    .then((_) => _.data.map((_) => semver.parse(_.name)));

/**
 * Returns a list of version numbers from a github repo's release names.
 * If a release does not contain a valid semantic version number as a name
 * we will try to parse the associated git tag instead.
 *
 * @param owner The name of the owning org - eg: https://github.com/<OWNER>
 *
 * @param repo The name of the repo - eg: https://github.com/<OWNER>/<REPO>
 *
 * @param octokit We provide a default Octokit client that should work for
 *                most cases but you can override it if you wish.
 *
 * @returns An array of parsed semantic version numbers.
 *
 * NB: This does not page the API, only the first page of releases are parsed.
 */
export const ghReleases = (owner: string, repo: string, octokit = OCTOKIT) => () =>
  octokit.repos.listReleases({ owner, repo })
    .then((_) => _.data.map((_) => semver.parse(_.name ?? _.tag_name)));

/**
 * A simple string template for a github release artifact url.
 *
 * @param owner The name of the owning org - eg: https://github.com/<OWNER>
 * @param repo The name of the repo - eg: https://github.com/<OWNER>/<REPO>
 * @param version A version string for the release.
 * @param filename Finally the filename you wish to download.
 * @returns A fully formed url pointing at a github release artifact.
 */
export const ghReleaseUrl = (owner: string, repo: string, version: string, filename: string) =>
  `https://github.com/${owner}/${repo}/releases/download/${version}/${filename}`;

/**
 * Use this to help provide a list of sources to a recipe.
 *
 * Usage Example:
 *
 * ```ts
 * import * as f from "lib/mod.ts";
 *
 * export default new f.Recipe({
 *   sources: f.ghReleaseSrc({
 *     owner: "acme-co", repo: "rocket-launcher",
 *     checksumFilename: "checksums.txt",
 *     filenames: [
 *       ({ v, os, arch, exe }) => exe(`rocket_ship_${v}_${os}_${arch}`),
 *     ],
 *   }),
 * });
 * ```
 *
 * @param owner The name of the owning org - eg: https://github.com/<OWNER>
 *
 * @param repo The name of the repo - eg: https://github.com/<OWNER>/<REPO>
 *
 * @param checksumFilename The name of a checksum file that most publish along
 *                         with the artifacts of a github release so you can
 *                         verify what you downloaded is what they published.
 *
 *                         If this is not given we will just download the file
 *                         & calculate the digest. As rattler-build requires it
 *                         to be set.
 *
 * @param filenames An array of functions that, given a ctx object with version,
 *                  targetOs & targetArch can return a filename to download.
 *
 * @param digestAlg The digest algorithm that the checksum file contains,
 *                  we default this to SHA-256.
 *
 * @param vPrefix A string to prefix the version number with.
 *                By default this is set to `v`.
 *
 * @returns A recipe source function that can return a list of sources to download.
 */
export const ghReleaseSrc = (
  { owner, repo, filenames, checksumFilename, digestAlg = "SHA-256", vPrefix = "v" }: {
    owner: string;
    repo: string;
    checksumFilename?: string;
    filenames: ((ctx: DslCtx) => string)[];
    digestAlg?: DigestAlgorithmName;
    vPrefix?: string;
  },
) =>
(ctx: DslCtx) =>
  radash.map(filenames, async (filename) => {
    const v = `${vPrefix}${ctx.v}`;
    const fN = filename(ctx);
    const url = ghReleaseUrl(owner, repo, v, fN);
    return {
      url,
      hash: checksumFilename
        ? await digestFromChecksumURL(digestAlg, fN, ghReleaseUrl(owner, repo, v, checksumFilename))
        : await Digest.fromBuffer(
          (await ky.get(url, { redirect: "follow", headers: getDenoAuthHeaders(url) })).body!,
          "SHA-256",
        ),
    };
  });
