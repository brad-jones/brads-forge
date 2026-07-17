import * as r from "lib/mod.ts";

const owner = "podplane";
const repo = "podplane";

export default new r.Recipe({
  name: "podplane",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin" },
    archMap: { "64": "amd64", "arm64": "arm64" },
  }),
  about: {
    homepage: "https://podplane.dev",
    summary:
      "Kubernetes distribution & PaaS you can deploy in a few minutes to your AWS, GCP, or Proxmox VE environment.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`)
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("podplane"));
      await r.moveGlob("./podplane_*/podplane", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`podplane --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
