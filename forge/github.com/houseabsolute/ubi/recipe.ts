import { outdent } from "@cspotcode/outdent";
import * as r from "lib/mod.ts";

const owner = "houseabsolute";
const repo = "ubi";

export default new r.Recipe({
  name: "ubi",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macOS", "win": "Windows-msvc", "linux": "Linux-musl" },
    archMap: { "32": "i686", "64": "x86_64", "aarch64": "arm64" },
    fileName: (_, os, arch) =>
      `ubi-${os}-${arch}.${os === "Windows-msvc" ? "zip" : "tar.gz"}`,
  }),
  about: {
    summary: "The Universal Binary Installer",
    repository: `https://github.com/${owner}/${repo}`,
    description: outdent`
      # The Universal Binary Installer Library and CLI Tool

      When I say "universal", I mean it downloads binaries from GitHub
      or GitLab releases.

      When I say "binary", I mean it handles single-file executables like those
      created by most Go and Rust projects.

      When I say "installer", I mean it plops the binary wherever you tell it to.

      And finally, when I say "UBI", I don't mean
      "[universal basic income](https://en.wikipedia.org/wiki/Universal_basic_income)",
      but that'd be nice too.
    `,
    license: "MIT",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("ubi"));
      await r.moveGlob("./ubi*/ubi*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`ubi --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
