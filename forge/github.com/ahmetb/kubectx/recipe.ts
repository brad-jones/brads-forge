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
    number: 2,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const kubectx = r.path.join(prefixDir, "bin", exe("kubectx"));
      await r.moveGlob("./kubectx*/kubectx*", kubectx);
      if (unix) {
        await Deno.chmod(kubectx, 0o755);
        await Deno.symlink(kubectx, r.path.join(prefixDir, "bin/kubectl-ctx"));
      }

      const kubens = r.path.join(prefixDir, "bin", exe("kubens"));
      await r.moveGlob("./kubens*/kubens*", kubens);
      if (unix) {
        await Deno.chmod(kubens, 0o755);
        await Deno.symlink(kubens, r.path.join(prefixDir, "bin/kubectl-ns"));
      }

      if (!unix) {
        const scriptFile = r.path.join(prefixDir, "etc/conda/activate.d/script.bat");
        await r.ensureDir(r.path.dirname(scriptFile));
        await Deno.writeTextFile(
          scriptFile,
          'mklink /H "%CONDA_PREFIX%\\bin\\kubectl-ctx.exe" "%CONDA_PREFIX%\\bin\\kubectx.exe"\r\n' +
            'mklink /H "%CONDA_PREFIX%\\bin\\kubectl-ns.exe" "%CONDA_PREFIX%\\bin\\kubens.exe"',
        );
      }
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
