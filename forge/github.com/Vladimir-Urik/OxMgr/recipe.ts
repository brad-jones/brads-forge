import * as r from "lib/mod.ts";

const owner = "Vladimir-Urik";
const repo = "OxMgr";

export default new r.Recipe({
  name: "oxmgr",
  about: {
    homepage: "https://oxmgr.empellio.com",
    summary:
      "A modern, lightweight process manager written in Rust — a fast, deterministic alternative to PM2 for managing any executable across platforms",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`,
    ).text(),
    license: "MIT",
  },
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { osx: "apple-darwin", win: "pc-windows-msvc", linux: "unknown-linux-gnu" },
    archMap: { "64": "x86_64", "arm64": "aarch64" },
    fileName: (v, os, arch) => `oxmgr-${v}-${arch}-${os}.${os === "pc-windows-msvc" ? "zip" : "tar.gz"}`,
  }),
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("oxmgr"));
      await r.moveGlob("./oxmgr*/oxmgr*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`oxmgr --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
