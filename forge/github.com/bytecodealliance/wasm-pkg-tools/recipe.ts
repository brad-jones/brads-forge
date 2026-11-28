import * as r from "lib/mod.ts";

const owner = "bytecodealliance";
const repo = "wasm-pkg-tools";

export default new r.Recipe({
  name: "wkg",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { osx: "apple-darwin", win: "pc-windows-gnu", linux: "unknown-linux-gnu" },
    archMap: { "64": "x86_64", "arm64": "aarch64" },
    fileName: (_v, os, arch) => `wkg-${arch}-${os}`,
  }),
  about: {
    homepage: `https://github.com/${owner}/${repo}`,
    summary: "Tooling to package, publish and fetch Wasm components",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false, overlinking_behavior: "ignore" },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("wkg"));
      await r.moveGlob("./wkg-*/wkg-*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion, exe }) => {
      if (r.coerceSemVer(await r.$`${exe("wkg")} --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
