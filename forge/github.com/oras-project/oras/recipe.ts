import { outdent } from "@cspotcode/outdent";
import * as r from "lib/mod.ts";

const owner = "oras-project";
const repo = "oras";

export default new r.Recipe({
  name: "oras",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64", "aarch64": "arm64" },
    fileName: (version, os, arch) =>
      `oras_${version.replace("v", "")}_${os}_${arch}.${
        os === "windows" ? "zip" : "tar.gz"
      }`,
  }),
  about: {
    homepage: "https://oras.land",
    summary:
      "OCI registry client - managing content like artifacts, images, packages",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      "https://raw.githubusercontent.com/oras-project/oras/refs/heads/main/README.md",
    ).text(),
    license: "Apache-2.0",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("oras"));
      await r.moveGlob("./oras*/oras*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`oras version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
