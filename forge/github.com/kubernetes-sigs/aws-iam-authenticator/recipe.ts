import * as r from "lib/mod.ts";

const owner = "kubernetes-sigs";
const repo = "aws-iam-authenticator";

export default new r.Recipe({
  name: "aws-iam-authenticator",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://github.com/kubernetes-sigs/aws-iam-authenticator",
    summary: "A tool to use AWS IAM credentials to authenticate to a Kubernetes cluster",
    description: await r.http.get(
      "https://raw.githubusercontent.com/kubernetes-sigs/aws-iam-authenticator/refs/heads/master/README.md",
    )
      .text(),
    license: "Apache-2.0",
  },
  build: {
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const bin = r.path.join(prefixDir, "bin", exe("aws-iam-authenticator"));
      await r.moveGlob("./aws-iam-authenticator*/aws-iam-authenticator*", bin);
      if (unix) await Deno.chmod(bin, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`aws-iam-authenticator version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
