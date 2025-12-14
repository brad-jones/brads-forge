import * as r from "lib/mod.ts";

const owner = "digitalocean";
const repo = "doctl";

export default new r.Recipe({
  name: "doctl",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "32": "386", "64": "amd64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://www.digitalocean.com/docs/apis-clis/doctl/",
    repository: `https://github.com/${owner}/${repo}`,
    summary: "The official command line interface for the DigitalOcean API",
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`)
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("doctl"));
      await r.moveGlob("./doctl*/doctl*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const output = await r.$`doctl version`.text();
      const version = output.match(/doctl version ([\d.]+)/)?.[1];
      if (!version || r.coerceSemVer(version) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
