import * as r from "lib/mod.ts";

const owner = "saero-ai";
const repo = "xcaffold";

export default new r.Recipe({
  name: "xcaffold",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
    fileName: (_, os, arch) =>
      `xcaffold_${os}_${arch}.${os === "windows" ? "zip" : "tar.gz"}`,
  }),
  about: {
    homepage: "https://www.xcaffold.com/",
    summary:
      "Deterministic Agent Harness-as-Code. Declare agents, rules, skills, and policies in .xcaf manifests — compile to native config for Claude Code, Cursor, Gemini, Codex and more.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      "https://raw.githubusercontent.com/saero-ai/xcaffold/refs/heads/main/README.md",
    ).text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("xcaffold"));
      await r.moveGlob("./xcaffold*/xcaffold*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`xcaffold --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
