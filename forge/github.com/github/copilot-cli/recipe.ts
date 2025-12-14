import * as r from "lib/mod.ts";

const owner = "github";
const repo = "copilot-cli";

export default new r.Recipe({
  name: "copilot-cli",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { osx: "darwin", win: "win32" },
    archMap: { "64": "x64", "aarch64": "arm64" },
    fileName: (_, os, arch) => `copilot-${os}-${arch}.${os === "win32" ? "zip" : "tar.gz"}`,
  }),
  about: {
    homepage: "https://docs.github.com/copilot/concepts/agents/about-copilot-cli",
    repository: `https://github.com/${owner}/${repo}`,
    summary: "GitHub Copilot CLI (Public Preview)",
    description: await r.http.get("https://raw.githubusercontent.com/github/copilot-cli/refs/heads/main/README.md")
      .text(),
    license: "LicenseRef-GitHub-PreRelease",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("copilot"));
      await r.moveGlob("./copilot*/copilot*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`copilot --version`.text().then((t) => t.trim())) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
