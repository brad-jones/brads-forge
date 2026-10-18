import * as r from "lib/mod.ts";

const owner = "grain-lang";
const repo = "grain";

export default new r.Recipe({
  name: "grain",
  // The repo also carries stdlib-v* and @grain/compiler-v* tags; only grain-v* has the binary assets.
  version: r.latestGithubTag({ owner, repo, tagFilter: /^grain-v\d+\.\d+\.\d+$/ }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "mac" },
    archMap: { "64": "x64" },
  }),
  about: {
    homepage: "https://grain-lang.org",
    summary: "The Grain compiler and CLI, a strongly typed functional language that compiles to WebAssembly",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "MIT AND LGPL-3.0-only",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("grain"));
      await r.moveGlob("./grain-*/grain-*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`grain --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }

      // Compiling and running a program proves the bundled stdlib is present, which --version does not.
      const dir = await Deno.makeTempDir();
      try {
        const file = r.path.join(dir, "hello.gr");
        await Deno.writeTextFile(file, `module Hello\n\nprint("hello from grain")\n`);
        if ((await r.$`grain ${file}`.text()).trim() !== "hello from grain") {
          throw new Error(`unexpected output from compiled program`);
        }
      } finally {
        await Deno.remove(dir, { recursive: true });
      }
    },
  },
});
