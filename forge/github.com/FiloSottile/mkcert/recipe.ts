import * as r from "lib/mod.ts";

const owner = "FiloSottile";
const repo = "mkcert";

export default new r.Recipe({
  name: "mkcert",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64" },
  }),
  about: {
    homepage: `https://github.com/${owner}/${repo}`,
    summary: "A simple zero-config tool for making locally-trusted development certificates",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`,
    ).text(),
    license: "BSD-3-Clause",
  },
  // `nss` (provides `certutil`) is only published on conda-forge for linux/osx — no win-64/win-arm64 build exists.
  // mkcert itself works fine without it on Windows (skips Firefox trust-store install with a warning).
  requirements: (ctx) => ({
    run: ctx.unix ? ["nss"] : [],
  }),
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("mkcert"));
      await r.moveGlob("./mkcert-*/mkcert-*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`mkcert -version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
