import * as r from "lib/mod.ts";

const owner = "denoland";
const repo = "deno";

export default new r.Recipe({
  name: "deno",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    checksumFileExt: ".sha256sum",
    checksumExtractor: (txt) => txt.split("\n")[2].split(":")[1].trim().toLowerCase(),
    fileName: (_, os, arch) => `deno-${arch}-${os}.zip`,
    osMap: { "osx": "apple-darwin", "win": "pc-windows-msvc", "linux": "unknown-linux-gnu" },
    archMap: { "64": "x86_64", "arm64": "aarch64" },
  }),
  about: {
    homepage: "https://deno.com/",
    summary: "A modern runtime for JavaScript and TypeScript.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get("https://raw.githubusercontent.com/denoland/deno/refs/heads/main/README.md").text(),
    license: "MIT",
  },
  build: {
    number: 4,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const deno = r.path.join(prefixDir, "bin", exe("deno"));
      await r.moveGlob("./deno*/deno*", deno);
      if (unix) await Deno.chmod(deno, 0o755);
      await r.activation.addEnvVars({
        "DENO_INSTALL_ROOT": "$CONDA_PREFIX/bin",
        "DENO_DIR": "$CONDA_PREFIX/var/cache/deno",
      });

      if (unix) {
        await r.activation.addLink(deno, r.path.join(prefixDir, "bin", exe("dx")));
      }
    },
  },
  tests: {
    func: async ({ pkgVersion, unix, prefixDir, exe }) => {
      const deno = r.path.join(prefixDir, "bin", exe("deno"));
      if (r.coerceSemVer((await r.$`${deno} --version`.text()).split("\n")[0]) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }

      if (unix) {
        const dx = r.path.join(prefixDir, "bin", exe("dx"));
        if ((await r.$`${dx} --help`.text()).split("\n")[0] !== "Execute a binary from npm or jsr, like npx") {
          throw new Error(`dx alias not working`);
        }
      }
    },
  },
});
