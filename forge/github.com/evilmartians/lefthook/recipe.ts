import * as r from "lib/mod.ts";

const owner = "evilmartians";
const repo = "lefthook";

export default new r.Recipe({
  name: "lefthook",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "linux": "Linux", "osx": "MacOS", "win": "Windows" },
    archMap: { "32": "i386", "64": "x86_64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://github.com/evilmartians/lefthook",
    summary: "Fast and powerful Git hooks manager for any type of projects.",
    description: await r.http.get("https://raw.githubusercontent.com/evilmartians/lefthook/refs/heads/master/README.md")
      .text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("lefthook"));
      await r.archive.gunzipFile("./lefthook*", "./lefthook");
      await r.move("./lefthook", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (await r.$`lefthook version`.text() !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
