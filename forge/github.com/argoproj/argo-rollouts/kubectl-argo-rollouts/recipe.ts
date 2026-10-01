import * as r from "lib/mod.ts";

const owner = "argoproj";
const repo = "argo-rollouts";

export default new r.Recipe({
  name: "kubectl-argo-rollouts",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://argo-rollouts.readthedocs.io/",
    summary: "Kubectl plugin and dashboard for Argo Rollouts progressive delivery",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`)
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("kubectl-argo-rollouts"));
      await r.moveGlob("./kubectl-argo-rollouts*/kubectl-argo-rollouts*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const out = await r.$`kubectl-argo-rollouts version --short`.text();
      if (r.coerceSemVer(out) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary: ${out}`);
      }
    },
  },
});
