import * as r from "lib/mod.ts";

const owner = "mattn";
const repo = "goreman";

export default new r.Recipe({
  name: "goreman",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin" },
  }),
  about: {
    homepage: `https://github.com/${owner}/${repo}`,
    summary: "Foreman clone written in Go language",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`)
      .text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const goreman = r.path.join(prefixDir, "bin", exe("goreman"));
      await r.moveGlob("./goreman_v*/goreman", goreman);
      if (unix) await Deno.chmod(goreman, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const output = (await r.$`goreman version`.text()).trim();
      if (r.coerceSemVer(output) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
