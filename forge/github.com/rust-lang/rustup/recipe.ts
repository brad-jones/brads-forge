import * as r from "lib/mod.ts";

const OWNER = "rust-lang";
const REPO = "rustup";

const MAPPED_OS = (os: r.PlatformOs) => {
  switch (os) {
    case "osx":
      return "apple-darwin";
    case "win":
      return "pc-windows-msvc";
    case "linux":
      return "unknown-linux-musl";
    default:
      return os;
  }
};

const MAPPED_ARCH = (arch: r.PlatformArch) => {
  switch (arch) {
    case "64":
      return "x86_64";
    case "arm64":
      return "aarch64";
    default:
      return arch;
  }
};

export default new r.Recipe({
  name: "rustup",
  about: {
    summary: "rustup is an installer for the systems programming language Rust.",
    homepage: "https://rustup.rs/",
    documentation: "https://rust-lang.github.io/rustup/",
    repository: `https://github.com/${OWNER}/${REPO}`,
    license: "MIT",
  },
  platforms: r.commonPlatforms,
  versions: r.ghTags(OWNER, REPO),
  sources: async ({ v, os, arch, exe }) => {
    const triple = `${MAPPED_ARCH(arch)}-${MAPPED_OS(os)}`;
    const baseUrl = `https://static.rust-lang.org/rustup/archive/${v}/${triple}/${exe("rustup-init")}`;
    const hash = (await r.http.get(`${baseUrl}.sha256`).text()).split("\n")[0].split(" ")[0].trim();
    return [{ url: baseUrl, hash: r.Digest.parse(`sha256:${hash}`) }];
  },
  build: {
    number: 7,
    script: async ({ prefixDir, unix, exe }) => {
      // Install the main binary
      const dst = r.path.join(prefixDir, "bin", exe("rustup"));
      await r.moveGlob("./rustup*", dst);
      if (unix) await Deno.chmod(dst, 0o755);

      // Create a rustup-init link back to rustup. It has some magic in it that
      // presents a totally different CLI interface based on the name of the binary.
      // You use rustup-init to do an initial install of rust & then start using
      // rustup to manage what targets you have installed, etc.
      await Deno.symlink(dst, r.path.join(prefixDir, "bin", exe("rustup-init")), { type: "file" });

      // Configure rustup to install everything with-in the pixi environment
      const envFile = r.path.join(prefixDir, "etc", "conda", "env_vars.d", "rustup.json");
      await r.ensureDir(r.path.dirname(envFile));
      await Deno.writeTextFile(
        envFile,
        JSON.stringify({
          RUSTUP_HOME: "${CONDA_PREFIX}/.rustup",
          CARGO_HOME: "${CONDA_PREFIX}/.cargo",
          PATH: "${CARGO_HOME}/bin:${PATH}",
        }),
      );
    },
  },
  test: {
    script: async ({ version, exe }) => {
      if (!await r.exists(`../../bin/${exe("rustup")}`)) {
        throw new Error(`failed to locate binary in package`);
      }

      const actualVersion = (await r.shell.$`rustup --version`)
        .match(/\d+\.\d+\.\d+/)?.at(0) ?? "";

      if (!r.semver.eq(r.semver.parse(actualVersion), version)) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
