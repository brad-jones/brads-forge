import * as r from "lib/mod.ts";

const OWNER = "dprint";
const REPO = "dprint";

const MAPPED_OS = (os: r.PlatformOs) => {
  switch (os) {
    case "osx":
      return "apple-darwin";
    case "win":
      return "pc-windows-msvc";
    case "linux":
      return "unknown-linux-gnu";
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
  name: "dprint",
  about: {
    summary: "Pluggable and configurable code formatting platform written in Rust.",
    homepage: "hhttps://dprint.dev/",
    repository: `https://github.com/${OWNER}/${REPO}`,
    license: "MIT",
  },
  platforms: ["osx-arm64", "linux-aarch64", ...r.common64Platforms],
  versions: r.ghTags(OWNER, REPO),
  sources: r.ghReleaseSrc({
    owner: OWNER,
    repo: REPO,
    checksumFilename: "SHASUMS256.txt",
    filenames: [({ os, arch }) => `dprint-${MAPPED_ARCH(arch)}-${MAPPED_OS(os)}.zip`],
    vPrefix: "",
  }),
  build: {
    script: async ({ prefixDir, unix, exe }) => {
      const dst = r.path.join(prefixDir, "bin", exe("dprint"));
      await r.moveGlob("./dprint*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  test: {
    script: async ({ version, exe }) => {
      if (!await r.exists(`../../bin/${exe("dprint")}`)) {
        throw new Error(`failed to locate binary in package`);
      }

      const actualVersion = (await r.shell.$`dprint --version`)
        .match(/\d+\.\d+\.\d+/)?.at(0) ?? "";

      if (!r.semver.eq(r.semver.parse(actualVersion), version)) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
