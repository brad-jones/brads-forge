import { coerceSemVer } from "./coerce.ts";
import { Octokit } from "@octokit/rest";

export function latestGithubTag(options: { owner: string; repo: string; tagFilter?: RegExp }) {
  return async (): Promise<{ raw: string; semver?: string }> => {
    const octokit = new Octokit({
      auth: Deno.env.get("GH_TOKEN") ??
        Deno.env.get("GITHUB_TOKEN") ??
        Deno.env.get("GITHUB_API_TOKEN"),
    });
    const tags = await octokit.repos.listTags(options);
    const tag = tags.data.filter((_) => {
      if (options.tagFilter) return _.name.match(options.tagFilter);
      return !_.name.includes("-");
    })[0].name;
    console.log(`Found github/${options.owner}/${options.repo} tag: ${tag}`);
    return { raw: tag, semver: coerceSemVer(tag) };
  };
}
