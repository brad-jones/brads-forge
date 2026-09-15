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
    description: await r.http.get(
      "https://raw.githubusercontent.com/int128/kubelogin/refs/heads/master/README.md",
    )
      .text(),
    license: "Apache-2.0",
  },
  build: {
    number: 3,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("kubelogin"));
      await r.moveGlob("./kubelogin*/kubelogin*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
      await r.activation.addLink(
        dst,
        r.path.join(prefixDir, "bin", exe("kubectl-oidc_login")),
      );
    },
  },
  tests: {
    func: async ({ pkgVersion, unix }) => {
      if (unix) {
        // NB: Prior to v1.36.4 the release stamped the git sha into the
        // binary instead of the tag, hence the version had to be looked up
        // via the github api. These days the tag is stamped in as expected.
        if (r.coerceSemVer(await r.$`kubelogin --version`.text()) !== pkgVersion) {
          throw new Error(`unexpected version returned from kubelogin`);
        }
        if (
          r.coerceSemVer(await r.$`kubectl-oidc_login --version`.text()) !== pkgVersion
        ) {
          throw new Error(
            `unexpected version returned from kubectl-oidc_login`,
          );
        }
      } else {
        // NB: The Windows binary throws: error: unknown flag: --version
        // And running kubelogin.exe version only returns: kubelogin version  (go1.26.1 windows_amd64)
        // ie: the windows release does not stamp any version into the binary.
        if (
          !/^kubelogin version\s+\(go[\d.]+ windows_amd64\)$/.test(
            (await r.$`kubelogin version`.text("combined")).trim(),
          )
        ) {
          throw new Error(`unexpected version returned from kubelogin`);
        }
      }
    },
  },
});
