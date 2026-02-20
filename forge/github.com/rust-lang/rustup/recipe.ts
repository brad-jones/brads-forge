import * as r from "lib/mod.ts";

const owner = "rust-lang";
const repo = "rustup";

export default new r.Recipe({
  name: "rustup",
  about: {
    summary:
      "rustup is an installer for the systems programming language Rust.",
    homepage: "https://rustup.rs/",
    documentation: "https://rust-lang.github.io/rustup/",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      "https://raw.githubusercontent.com/rust-lang/rustup/refs/heads/main/README.md",
    )
      .text(),
    license: "MIT",
  },
  version: r.latestGithubTag({ owner, repo }),
  sources: async (v) => {
    const baseUrl = "https://static.rust-lang.org/rustup/archive";

    const buildUrl = (platform: string) =>
      `${baseUrl}/${v}/${platform}/rustup-init` +
      (platform.includes("windows") ? ".exe" : "");

    const getDigest = async (url: string) =>
      (await r.http.get(`${url}.sha256`).text())
        .split("\n")[0].split(" ")[0].trim();

    const buildSource = async (platform: string) => [{
      url: buildUrl(platform),
      sha256: await getDigest(buildUrl(platform)),
    }];

    return {
      "linux-64": await buildSource("x86_64-unknown-linux-musl"),
      "linux-aarch64": await buildSource("aarch64-unknown-linux-musl"),
      "win-64": await buildSource("x86_64-pc-windows-msvc"),
      "win-arm64": await buildSource("aarch64-pc-windows-msvc"),
      "osx-64": await buildSource("x86_64-apple-darwin"),
      "osx-arm64": await buildSource("aarch64-apple-darwin"),
    };
  },
  build: {
    number: 4,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      // Install the main binary
      const dst = r.path.join(prefixDir, "bin", exe("rustup"));
      await r.moveGlob("./rustup*", dst);
      if (unix) await Deno.chmod(dst, 0o755);

      // Create a rustup-init link back to rustup. It has some magic in it that
      // presents a totally different CLI interface based on the name of the binary.
      // You use rustup-init to do an initial install of rust & then start using
      // rustup to manage what targets you have installed, etc.
      await r.activation.addLink(
        dst,
        r.path.join(prefixDir, "bin", exe("rustup-init")),
      );

      // Configure rustup to install everything with-in the pixi environment
      await r.activation.addEnvVars({
        "RUSTUP_HOME": "${CONDA_PREFIX}/.rustup",
        "CARGO_HOME": "${CONDA_PREFIX}/.cargo",
      });

      await r.activation.prependToPATH("$CARGO_HOME/bin");
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`rustup --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from rustup`);
      }
      if (
        !(await r.$`rustup --help`.text()).includes(
          "The Rust toolchain installer",
        )
      ) {
        throw new Error(`unexpected help txt returned from rustup`);
      }

      if (
        r.coerceSemVer(await r.$`rustup-init --version`.text()) !== pkgVersion
      ) {
        throw new Error(`unexpected version returned from rustup-init`);
      }
      if (
        !(await r.$`rustup-init --help`.text()).includes(
          "The installer for rustup",
        )
      ) {
        throw new Error(`unexpected help txt returned from rustup-init`);
      }
    },
  },
});
