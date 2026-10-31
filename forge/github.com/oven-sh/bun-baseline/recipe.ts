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
    number: 4,
    dynamic_linking: {
      binary_relocation: false,
      overlinking_behavior: "ignore",
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("bun"));
      await r.moveGlob("./bun*/bun*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
      await r.activation.addLink(dst, r.path.join(prefixDir, "bin", exe("bunx")));
    },
  },
  tests: {
    func: async ({ pkgVersion, exe }) => {
      if (r.coerceSemVer((await r.$`bun --version`.text()).split("\n")[0]) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }

      if (!(await r.$`${exe("bunx")} --help 2>&1`.text()).split("\n")[0].startsWith("Usage: bunx ")) {
        throw new Error(`bunx alias not working`);
      }
    },
  },
});
