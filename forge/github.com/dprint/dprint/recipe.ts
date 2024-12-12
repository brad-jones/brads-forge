import * as r from "lib/mod.ts";

const owner = "dprint";
const repo = "dprint";

export default new r.Recipe({
  name: "dprint",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    checksumFilePattern: /SHASUMS256.txt/,
    osMap: { "osx": "apple-darwin", "win": "pc-windows-msvc", "linux": "unknown-linux-gnu" },
    archMap: { "64": "x86_64" },
  }),
  about: {
    homepage: "https://dprint.dev/",
    summary: "Pluggable and configurable code formatting platform written in Rust.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get("https://raw.githubusercontent.com/dprint/dprint/refs/heads/main/README.md").text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("dprint"));
      await r.moveGlob("./dprint*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ exe, pkgVersion }) => {
      const dprint = r.path.join("bin", exe("dprint"));

      if (!await r.exists(dprint)) {
        throw new Error(`failed to locate binary in package`);
      }

      if (r.coerceSemVer(await r.$`${dprint} --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
