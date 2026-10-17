import * as r from "lib/mod.ts";

const owner = "extism";
const repo = "js-pdk";

export default new r.Recipe({
  name: "extism-js",
  version: r.latestGithubTag({ owner, repo, tagFilter: /^v\d+\.\d+\.\d+$/ }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macos", "win": "windows", "linux": "linux" },
    archMap: { "64": "x86_64", "aarch64": "aarch64", "arm64": "aarch64" },
    checksumExtractor: (txt) => txt.trim(),
  }),
  about: {
    homepage: `https://github.com/${owner}/${repo}`,
    summary: "Compiles JavaScript and TypeScript into Extism WebAssembly plugins",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "BSD-3-Clause",
  },
  requirements: {
    // Provides the `wasm-merge` and `wasm-opt` tools that extism-js shells out to.
    run: ["binaryen"],
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false, overlinking_behavior: "ignore" },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("extism-js"));
      await r.archive.gunzipFile("./extism-js*/*.gz", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async () => {
      // The v1.7.0 binary still reports 1.6.1 from --version, so only the output shape can be asserted.
      if (!/^extism-js \d+\.\d+\.\d+/.test(await r.$`extism-js --version`.text())) {
        throw new Error(`unexpected version returned from binary`);
      }
      await r.$`wasm-opt --version`.quiet();
      await r.$`wasm-merge --version`.quiet();
    },
  },
});
