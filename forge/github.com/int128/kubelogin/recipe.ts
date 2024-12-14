import * as r from "lib/mod.ts";

const owner = "int128";
const repo = "kubelogin";

export default new r.Recipe({
  name: "kubelogin",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://github.com/int128/kubelogin",
    summary: "About kubectl plugin for Kubernetes OpenID Connect authentication (kubectl oidc-login)",
    description: await r.http.get("https://raw.githubusercontent.com/int128/kubelogin/refs/heads/master/README.md")
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("kubelogin"));
      await r.moveGlob("./kubelogin*/kubelogin", dst);
      if (unix) {
        await Deno.chmod(dst, 0o755);
        await Deno.symlink(dst, r.path.join(prefixDir, "bin/kubectl-oidc_login"));
      } else {
        const scriptFile = r.path.join(prefixDir, "etc/conda/activate.d/script.bat");
        await r.ensureDir(r.path.dirname(scriptFile));
        await Deno.writeTextFile(
          scriptFile,
          'mklink /H "%CONDA_PREFIX%\\bin\\kubectl-oidc_login.exe" "%CONDA_PREFIX%\\bin\\kubelogin.exe"',
        );
      }
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`kubelogin --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from kubelogin`);
      }
      if (r.coerceSemVer(await r.$`kubectl-oidc_login --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from kubectl-oidc_login`);
      }
    },
  },
});
