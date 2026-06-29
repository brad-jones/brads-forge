import * as r from "lib/mod.ts";

const owner = "loft-sh";
const repo = "vcluster";

export default new r.Recipe({
  name: "vcluster",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64", "arm64": "arm64" },
    fileName: (_, os, arch) => os === "windows" ? `vcluster-${os}-${arch}.exe` : `vcluster-${os}-${arch}`,
  }),
  about: {
    homepage: "https://www.vcluster.com/",
    summary:
      "Create fully functional virtual Kubernetes clusters — each vCluster runs inside a namespace of the underlying k8s cluster",
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
      const dst = r.path.join(prefixDir, "bin", exe("vcluster"));
      await r.moveGlob("./vcluster-*/vcluster*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const output = await r.$`vcluster version`.text();
      const version = output.match(/(\d+\.\d+\.\d+)/)?.[1];
      if (!version || r.coerceSemVer(version) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary: ${output}`);
      }
    },
  },
});
