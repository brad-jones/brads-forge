import * as r from "lib/mod.ts";

const owner = "DarthSim";
const repo = "overmind";

export default new r.Recipe({
  name: "overmind",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macos" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
    fileName: (v, os, arch) => `overmind-${v}-${os}-${arch}.gz`,
    checksumFileExt: ".sha256sum",
    checksumExtractor: (txt) => txt.trim(),
  }),
  about: {
    homepage: `https://github.com/${owner}/${repo}`,
    summary: "Process manager for Procfile-based applications and target tmux",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`,
    ).text(),
    license: "MIT",
  },
  requirements: {
    run: ["tmux"],
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("overmind"));
      await r.archive.gunzipFile("./overmind*/*.gz", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`overmind --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
