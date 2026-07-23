import * as r from "lib/mod.ts";

const owner = "jdx";
const repo = "pitchfork";

export default new r.Recipe({
  name: "pitchfork",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "apple-darwin", "win": "pc-windows-msvc", "linux": "unknown-linux-gnu" },
    archMap: { "64": "x86_64" },
  }),
  about: {
    homepage: "https://pitchfork.jdx.dev/",
    summary: "Daemons with DX - a CLI for managing daemons with a focus on developer experience",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("pitchfork"));
      await r.moveGlob("./pitchfork*/pitchfork*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`pitchfork --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
