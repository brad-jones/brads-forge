import * as r from "lib/mod.ts";

const owner = "kubevirt";
const repo = "kubevirt";

export default new r.Recipe({
  name: "virtctl",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
    fileName: (version, os, arch) => r.suffixExe(os)(`virtctl-${version}-${os}-${arch}`),
  }),
  about: {
    homepage: "https://kubevirt.io",
    summary: "Building a virtualization API for Kubernetes",
    description: await r.http.get("https://raw.githubusercontent.com/kubevirt/kubevirt/refs/heads/main/README.md")
      .text(),
    license: "Apache-2.0",
  },
  build: {
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const virtctl = r.path.join(prefixDir, "bin", exe("virtctl"));
      await r.moveGlob("./virtctl*/virtctl*", virtctl);
      if (unix) await Deno.chmod(virtctl, 0o755);
    },
  },
  tests: {
    func: async () => {
      // NB: We can not call "virtctl version" because it also attempts to find
      // the version of kubevirt on a cluster and we don't have a cluster in
      // this environment obviously. So the best we can do is simply validate
      // that the binary outputs some help text.
      if (
        (await r.$`virtctl --help`.text()).split("\n")[0] !==
          "virtctl controls virtual machine related operations on your kubernetes cluster."
      ) {
        throw new Error(`virtctl help txt does not match`);
      }
    },
  },
});
