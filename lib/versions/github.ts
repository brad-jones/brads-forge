import { coerceSemVer } from "./coerce.ts";
import { Octokit } from "@octokit/rest";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import * as semver from "@std/semver";

export function latestGithubTag(
  options: {
    owner: string;
    repo: string;
    tagFilter?: RegExp | ((tag: string) => boolean);
  },
) {
  return async (): Promise<{ raw: string; semver?: string }> => {
    const octokit = new (Octokit.plugin(paginateRest))({
      auth: Deno.env.get("GH_TOKEN") ??
        Deno.env.get("GITHUB_TOKEN") ??
        Deno.env.get("GITHUB_API_TOKEN"),
    });

    const tags = (await octokit.paginate("GET /repos/{owner}/{repo}/tags", {
      owner: options.owner,
      repo: options.repo,
      per_page: 100,
    }))
      .filter((_) => {
        if (options.tagFilter) {
          if (typeof options.tagFilter === "function") {
            return options.tagFilter(_.name);
          } else {
            return _.name.match(options.tagFilter);
          }
        }
        return !_.name.includes("-");
      })
      .map((_) => ({ raw: _.name, semver: coerceSemVer(_.name) }))
      .filter((_) => _.semver !== undefined)
      .toSorted((a, b) =>
        semver.compare(semver.parse(b.semver!), semver.parse(a.semver!))
      );

    console.log(
      `Found github/${options.owner}/${options.repo} tag: ${
        tags[0].raw
      } semver: ${tags[0].semver}`,
    );
    return tags[0];
  };
}
