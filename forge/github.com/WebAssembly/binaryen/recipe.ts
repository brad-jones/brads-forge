import * as r from "lib/mod.ts";

const owner = "WebAssembly";
const repo = "binaryen";

const tools = [
  "wasm-opt",
  "wasm-merge",
  "wasm-as",
  "wasm-dis",
  "wasm-ctor-eval",
  "wasm-emscripten-finalize",
  "wasm-metadce",
  "wasm-reduce",
  "wasm-shell",
  "wasm-split",
  "wasm2js",
];

export default new r.Recipe({
  name: "binaryen",
  version: r.latestGithubTag({ owner, repo, tagFilter: /^version_\d+$/ }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "macos", "win": "windows", "linux": "linux" },
    // Upstream names arm builds `aarch64` on Linux but `arm64` on macOS and Windows.
    archMap: { "64": "x86_64", "aarch64": "aarch64", "arm64": "arm64" },
  }),
  about: {
    homepage: `https://github.com/${owner}/${repo}`,
    summary: "Compiler and toolchain infrastructure library for WebAssembly",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "Apache-2.0",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      for (const tool of tools) {
        const dst = r.path.join(prefixDir, "bin", exe(tool));
        await r.moveGlob(`./*/bin/${exe(tool)}`, dst);
        if (unix) await Deno.chmod(dst, 0o755);
      }
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`wasm-opt --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from wasm-opt`);
      }
      await r.$`wasm-merge --version`.quiet();
    },
  },
});
