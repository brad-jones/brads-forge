import * as r from "lib/mod.ts";

const owner = "vultr";
const repo = "vultr-cli";

export default new r.Recipe({
  name: "vultr-cli",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macOs", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://github.com/vultr/vultr-cli",
    summary: "Official command line tool for Vultr services",
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`)
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const vultr = r.path.join(prefixDir, "bin", exe("vultr"));
      await r.moveGlob("./vultr-cli*/vultr-cli*", vultr);
      if (unix) await Deno.chmod(vultr, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer((await r.$`vultr version`.text()).split(" ")[1]) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
