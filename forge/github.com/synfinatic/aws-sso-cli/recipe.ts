import * as r from "lib/mod.ts";

const owner = "synfinatic";
const repo = "aws-sso-cli";

export default new r.Recipe({
  name: "aws-sso-cli",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64" },
  }),
  about: {
    repository: `https://github.com/${owner}/${repo}`,
    summary: "A powerful tool for using AWS Identity Center for the CLI and web console.",
    description: await r.http.get("https://raw.githubusercontent.com/synfinatic/aws-sso-cli/refs/heads/main/README.md")
      .text(),
    license: "GPL-3.0-only",
  },
  build: {
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("aws-sso"));
      await r.moveGlob("./aws-sso*/aws-sso*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const versionLine = (await r.$`aws-sso version`.text("combined")).split("\n")[1];
      const versionText = versionLine.match(/\(v([^\)]+)\)/)?.[1] || "";
      if (r.coerceSemVer(versionText) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
