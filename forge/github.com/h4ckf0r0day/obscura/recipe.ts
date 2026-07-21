import * as r from "lib/mod.ts";

const owner = "h4ckf0r0day";
const repo = "obscura";

export default new r.Recipe({
  name: "obscura",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macos" },
  }),
  about: {
    homepage: "https://obscura.sh",
    summary: "The headless browser for AI agents and web scraping",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`)
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const obscura = r.path.join(prefixDir, "bin", exe("obscura"));
      const worker = r.path.join(prefixDir, "bin", exe("obscura-worker"));
      await r.moveGlob(`./obscura-*/${exe("obscura")}`, obscura);
      await r.moveGlob(`./obscura-*/${exe("obscura-worker")}`, worker);
      if (unix) {
        await Deno.chmod(obscura, 0o755);
        await Deno.chmod(worker, 0o755);
      }
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const output = (await r.$`obscura --version`.text()).trim();
      if (r.coerceSemVer(output) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
