import * as r from "lib/mod.ts";

const owner = "lightpanda-io";
const repo = "browser";

export default new r.Recipe({
  name: "lightpanda",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macos" },
    archMap: { "64": "x86_64" },
  }),
  about: {
    homepage: "https://lightpanda.io",
    summary: "Lightpanda: the headless browser designed for AI and automation",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "AGPL-3.0-or-later",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("lightpanda"));
      await r.moveGlob("./lightpanda-*/lightpanda-*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`lightpanda version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
