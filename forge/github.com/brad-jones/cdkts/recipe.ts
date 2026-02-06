import * as r from "lib/mod.ts";

const owner = "brad-jones";
const repo = "cdkts";

export default new r.Recipe({
  name: "cdkts",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { osx: "darwin", win: "windows" },
    archMap: { "64": "x86_64" },
  }),
  about: {
    homepage: "https://github.com/brad-jones/cdkts",
    summary: "CDK but TypeScript only, specifically built with Deno in mind.",
    description: await r.http.get("https://raw.githubusercontent.com/brad-jones/cdkts/refs/heads/master/README.md")
      .text(),
    license: "MIT",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("cdkts"));
      await r.moveGlob("./cdkts*/cdkts*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if ((await r.$`cdkts --version`.env({ NO_COLOR: "1" }).text()).trim() !== `cdkts ${pkgVersion}`) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
