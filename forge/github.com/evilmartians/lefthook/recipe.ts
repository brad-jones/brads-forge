import * as f from "lib/mod.ts";

const OWNER = "evilmartians";
const REPO = "lefthook";

const MAPPED_OS = (os: f.PlatformOs) => {
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

const MAPPED_ARCH = (arch: f.PlatformArch) => {
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

export default new f.Recipe({
  name: "lefthook",
  about: {
    summary: "Fast and powerful Git hooks manager for any type of projects.",
    homepage: `https://github.com/${OWNER}/${REPO}`,
    license: "MIT",
  },
  platforms: ["win-32", ...f.commonPlatforms],
  versions: f.ghReleases(OWNER, REPO),
  sources: f.ghReleaseSrc(OWNER, REPO, "lefthook_checksums.txt", [
    ({ version, targetOs, targetArch, suffixExe }) =>
      suffixExe(
        `lefthook_${f.vFmt(version)}_${MAPPED_OS(targetOs)}_${
          MAPPED_ARCH(targetArch)
        }`,
      ),
  ]),
  build: {
    script: async ({ targetOs, prefixDir, suffixExe }) => {
      const dst = f.path.join(prefixDir, "bin", suffixExe("lefthook"));
      await f.moveGlob("./lefthook*", dst);
      if (targetOs !== "win") await Deno.chmod(dst, 0o755);
    },
  },
  test: {
    script: async ({ version, targetPlatform, suffixExe }) => {
      if (!await f.exists(`../../bin/${suffixExe("lefthook")}`)) {
        throw new Error(`failed to locate binary in package`);
      }

      if (targetPlatform !== f.currentPlatform) {
        console.log("warn: tests can not run current platform");
        return;
      }

      if (!f.vEqual(f.vParse(await f.$`lefthook version`), version)) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
