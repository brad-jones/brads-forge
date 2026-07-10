#!/usr/bin/env -S deno run -qA --ext=ts
import * as r from "lib/mod.ts";

/*
  NB: The reason we built this recipe when https://github.com/conda-forge/skopeo-feedstock
  already exists is because the conda forge version depends on containers-common which has
  not been updated to the v2 registries.conf format, that recent versions of skopeo require.

  This recipe includes the binary and nothing else so there are no errors when running
  skopeo with the default config (ie: no config file).
*/

const owner = "lework";
const repo = "skopeo-binary";

export default new r.Recipe({
  name: "skopeo",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
    fileName: (_, os, arch) => `skopeo-${os}-${arch}`,
  }),
  about: {
    homepage: "https://github.com/podman-container-tools/skopeo",
    summary: "Work with remote container image registries and OCI image layouts",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      "https://raw.githubusercontent.com/podman-container-tools/skopeo/refs/heads/main/README.md",
    ).text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("skopeo"));
      await r.moveGlob("./skopeo-*/skopeo-*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`skopeo --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
