import * as r from "lib/mod.ts";

const owner = "namespacelabs";
const repo = "foundation";

export default new r.Recipe({
  name: "nsc",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows", "linux": "linux" },
    archMap: { "64": "amd64", "arm64": "arm64", "aarch64": "arm64" },
    // Releases also contain the separate `ns` CLI archives, so pick the nsc ones explicitly.
    fileName: (tag, os, arch) => `nsc_${tag.replace(/^v/, "")}_${os}_${arch}.${os === "windows" ? "zip" : "tar.gz"}`,
  }),
  about: {
    homepage: "https://namespace.so/docs",
    summary: "The Namespace Cloud CLI",
    repository: `https://github.com/${owner}/${repo}`,
    description:
      "nsc is the command line interface for Namespace Cloud. It manages Namespace compute, remote builders and more, and ships the Docker and Bazel credential helpers.",
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      // Docker & Bazel find their credential helpers by name on PATH.
      for (const name of ["nsc", "docker-credential-nsc", "bazel-credential-nsc"]) {
        const dst = r.path.join(prefixDir, "bin", exe(name));
        await r.moveGlob(`./nsc_*/${exe(name)}`, dst);
        if (unix) await Deno.chmod(dst, 0o755);
      }
    },
  },
  tests: {
    func: async ({ pkgVersion, exe }) => {
      // nsc has no --version flag, only a version subcommand.
      const firstLine = (await r.$`${exe("nsc")} version`.text()).split("\n")[0];
      if (r.coerceSemVer(firstLine) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
