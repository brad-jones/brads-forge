import * as r from "lib/mod.ts";

const owner = "namespacelabs";
const repo = "devbox";

export default new r.Recipe({
  name: "devbox",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows", "linux": "linux" },
    archMap: { "64": "amd64", "arm64": "arm64", "aarch64": "arm64" },
    // Releases also contain the bare binaries, so pick the archives explicitly.
    fileName: (tag, os, arch) => `devbox_${tag.replace(/^v/, "")}_${os}_${arch}.${os === "windows" ? "zip" : "tar.gz"}`,
  }),
  about: {
    homepage: "https://namespace.so",
    summary: "CLI for creating and managing Namespace devboxes",
    repository: `https://github.com/${owner}/${repo}`,
    description:
      "The Namespace devbox CLI creates, connects to and manages remote development environments (devboxes) hosted on Namespace.",
    license: "LicenseRef-Proprietary",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("devbox"));
      await r.moveGlob("./devbox_*/devbox*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion, exe }) => {
      // devbox has no --version flag, only a version subcommand.
      if (r.coerceSemVer(await r.$`${exe("devbox")} version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
