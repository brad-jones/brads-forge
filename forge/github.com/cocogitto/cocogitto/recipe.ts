import * as r from "lib/mod.ts";

const owner = "cocogitto";
const repo = "cocogitto";

export default new r.Recipe({
  name: "cocogitto",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "apple-darwin", "win": "pc-windows-msvc" },
    archMap: { "64": "x86_64", "armv7l": "armv7" },
  }),
  about: {
    homepage: "https://docs.cocogitto.io/",
    summary: "The Conventional Commits toolbox",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get("https://raw.githubusercontent.com/cocogitto/cocogitto/refs/heads/main/README.md")
      .text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("cog"));
      await r.moveGlob("./**/cog*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ exe, pkgVersion }) => {
      const cog = r.path.join("bin", exe("cog"));

      if (!await r.exists(cog)) {
        throw new Error(`failed to locate binary in package`);
      }

      if (r.coerceSemVer(await r.$`${cog} --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
