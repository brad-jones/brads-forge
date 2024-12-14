import * as r from "lib/mod.ts";

const owner = "ahmetb";
const repo = "kubectx";

export default new r.Recipe({
  name: "kubectx",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "x86_64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://kubectx.dev",
    summary: "Faster way to switch between clusters and namespaces in kubectl",
    description: await r.http.get("https://raw.githubusercontent.com/ahmetb/kubectx/refs/heads/master/README.md")
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 3,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const kubectx = r.path.join(prefixDir, "bin", exe("kubectx"));
      await r.moveGlob("./kubectx*/kubectx*", kubectx);
      if (unix) await Deno.chmod(kubectx, 0o755);
      await r.activation.addLink(kubectx, r.path.join(prefixDir, "bin", exe("kubectl-ctx")));

      const kubens = r.path.join(prefixDir, "bin", exe("kubens"));
      await r.moveGlob("./kubens*/kubens*", kubens);
      if (unix) await Deno.chmod(kubens, 0o755);
      await r.activation.addLink(kubens, r.path.join(prefixDir, "bin", exe("kubectl-ns")));
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`kubectx --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from kubectx`);
      }
      if (r.coerceSemVer(await r.$`kubectl-ctx --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from kubectl-ctx`);
      }
      if (r.coerceSemVer(await r.$`kubens --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from kubens`);
      }
      if (r.coerceSemVer(await r.$`kubectl-ns --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from kubectl-ns`);
      }
    },
  },
});
