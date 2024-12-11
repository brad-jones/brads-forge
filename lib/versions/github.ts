import { Octokit } from "@octokit/rest";

const OCTOKIT = new Octokit({
  auth: Deno.env.get("GH_TOKEN") ??
    Deno.env.get("GITHUB_TOKEN") ??
    Deno.env.get("GITHUB_API_TOKEN"),
});

export async function latestGithubTag(options: { owner: string; repo: string }, octokit = OCTOKIT) {
  const tags = await octokit.repos.listTags(options);
  const tag = tags.data[0].name;
  console.log(`Found github/${options.owner}/${options.repo} tag: ${tag}`);
  return tag;
}
