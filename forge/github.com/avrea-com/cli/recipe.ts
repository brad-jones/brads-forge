import * as r from "lib/mod.ts";

const owner = "avrea-com";
const repo = "cli";

export default new r.Recipe({
  name: "avr",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
    fileName: (tag, os, arch) => `avr_${tag.replace(/^v/, "")}_${os}_${arch}.${os === "windows" ? "zip" : "tar.gz"}`,
  }),
  about: {
    homepage: "https://avrea.com",
    summary: "Official CLI for Avrea",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("avr"));
      await r.moveGlob(`./avr_*/${exe("avr")}`, dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion, exe }) => {
      if (r.coerceSemVer(await r.$`${exe("avr")} --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
