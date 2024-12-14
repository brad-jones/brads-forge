import * as r from "lib/mod.ts";
import { encodeBase64 } from "@std/encoding";

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
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("deno"));
      await r.moveGlob("./deno*/deno*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
      await r.activation.addEnvVars({
        "DENO_INSTALL_ROOT": "$PREFIX/bin",
        "DENO_DIR": "$PREFIX/var/cache/deno",
      });
    },
  },
  tests: {
    func: async ({ pkgVersion, exe }) => {
      if (
        Deno.env.get("DENO_DIR")?.replaceAll("\\", "/") !==
          `${Deno.env.get("PREFIX")?.replaceAll("\\", "/")}/var/cache/deno`
      ) {
        throw new Error(`DENO_DIR not set correctly`);
      }

      const deno = r.path.join("bin", exe("deno"));
      if (r.coerceSemVer((await r.$`${deno} --version`.text()).split("\n")[0]) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
