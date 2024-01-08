import * as r from "lib/mod.ts";

const OWNER = "evilmartians";
const REPO = "lefthook";

const MAPPED_OS = (os: r.PlatformOs) => {
  switch (os) {
    case "linux":
      return "Linux";
    case "osx":
      return "MacOS";
    case "win":
      return "Windows";
    default:
      return os;
  }
};

const MAPPED_ARCH = (arch: r.PlatformArch) => {
  switch (arch) {
    case "32":
      return "i386";
    case "64":
      return "x86_64";
    case "aarch64":
      return "arm64";
    default:
      return arch;
  }
};

export default new r.Recipe({
  name: "lefthook",
  about: {
    summary: "Fast and powerful Git hooks manager for any type of projects.",
    homepage: `https://github.com/${OWNER}/${REPO}`,
    license: "MIT",
  },
  platforms: ["win-32", ...r.commonPlatforms],
  versions: r.ghReleases(OWNER, REPO),
  sources: r.ghReleaseSrc({
    owner: OWNER,
    repo: REPO,
    checksumFilename: "lefthook_checksums.txt",
    filenames: [({ v, os, arch, exe }) => exe(`lefthook_${v}_${MAPPED_OS(os)}_${MAPPED_ARCH(arch)}`)],
  }),
  build: {
    number: 1,
    script: async ({ prefixDir, unix, exe }) => {
      const dst = r.path.join(prefixDir, "bin", exe("lefthook"));
      await r.moveGlob("./lefthook*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  test: {
    script: async ({ version, exe }) => {
      const lefthook = r.path.join("..", "..", "bin", exe("lefthook"));

      if (!await r.exists(lefthook)) {
        throw new Error(`failed to locate binary in package`);
      }

      if (!r.semver.eq(r.semver.parse(await r.shell.$`${lefthook} version`), version)) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
