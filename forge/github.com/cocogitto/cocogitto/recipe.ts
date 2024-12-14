import * as r from "lib/mod.ts";

const owner = "cocogitto";
const repo = "cocogitto";

export default new r.Recipe({
  name: "cocogitto",
  about: {
    homepage: "https://docs.cocogitto.io/",
    summary: "The Conventional Commits toolbox",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get("https://raw.githubusercontent.com/cocogitto/cocogitto/refs/heads/main/README.md")
      .text(),
    license: "MIT",
  },
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "apple-darwin", "win": "pc-windows-msvc" },
    archMap: { "64": "x86_64", "armv7l": "armv7" },
  }),
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("cog"));
      await r.moveGlob("./cocogitto*/**/cog*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`cog --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
