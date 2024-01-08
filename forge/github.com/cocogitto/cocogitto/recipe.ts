import * as r from "lib/mod.ts";

const OWNER = "cocogitto";
const REPO = "cocogitto";

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
    default:
      return arch;
  }
};

export default new r.Recipe({
  name: "cocogitto",
  about: {
    summary: "The Conventional Commits toolbox",
    homepage: "https://docs.cocogitto.io/",
    repository: `https://github.com/${OWNER}/${REPO}`,
    license: "MIT",
  },
  platforms: r.common64Platforms,
  versions: r.ghTags(OWNER, REPO),
  sources: r.ghReleaseSrc({
    owner: OWNER,
    repo: REPO,
    vPrefix: "",
    filenames: [({ os, arch, v }) => `cocogitto-${v}-${MAPPED_ARCH(arch)}-${MAPPED_OS(os)}.tar.gz`],
  }),
  build: {
    script: async ({ prefixDir, unix, exe }) => {
      const dst = r.path.join(prefixDir, "bin", exe("cog"));
      await r.moveGlob("./cog*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  test: {
    script: async ({ version, exe }) => {
      const cog = r.path.join("..", "..", "bin", exe("cog"));

      if (!await r.exists(cog)) {
        throw new Error(`failed to locate binary in package`);
      }

      const actualVersion = (await r.shell.$`${cog} --version`)
        .match(/\d+\.\d+\.\d+/)?.at(0) ?? "";

      if (!r.semver.eq(r.semver.parse(actualVersion), version)) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
