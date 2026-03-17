import * as r from "lib/mod.ts";

const owner = "ankitpokhrel";
const repo = "jira-cli";

export default new r.Recipe({
  name: "jira-cli",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macOS", "win": "windows" },
    archMap: { "64": "x86_64", "32": "i386", "aarch64": "arm64" },
  }),
  about: {
    repository: `https://github.com/${owner}/${repo}`,
    summary: "Feature-rich interactive Jira command line.",
    description: await r.http.get(
      "https://raw.githubusercontent.com/ankitpokhrel/jira-cli/refs/heads/main/README.md",
    )
      .text(),
    license: "MIT",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("jira"));
      await r.moveGlob("./jira*/bin/jira*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (
        r.coerceSemVer(await r.$`jira version`.text("combined")) !==
          pkgVersion
      ) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
