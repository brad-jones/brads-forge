import * as r from "lib/mod.ts";

const owner = "oven-sh";
const repo = "bun";

export default new r.Recipe({
  name: "bun-baseline",
  version: r.latestGithubTag({ owner, repo, tagFilter: /bun-v.*/ }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    fileName: (_, os, arch) => `bun-${os}-${arch}-baseline.zip`,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "x64", "arm64": "aarch64" },
  }),
  about: {
    homepage: "https://bun.sh/",
    summary: "Incredibly fast JavaScript runtime, bundler, test runner, and package manager - all in one",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get("https://raw.githubusercontent.com/oven-sh/bun/refs/heads/main/README.md").text(),
    license: "MIT",
  },
  build: {
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("bun"));
      await r.moveGlob("./bun*/bun*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer((await r.$`bun --version`.text()).split("\n")[0]) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
