import * as r from "lib/mod.ts";

const OWNER = "go-task";
const REPO = "task";

const MAPPED_OS = (os: r.PlatformOs) => {
  switch (os) {
    case "osx":
      return "darwin";
    case "win":
      return "windows";
    default:
      return os;
  }
};

const MAPPED_ARCH = (arch: r.PlatformArch) => {
  switch (arch) {
    case "32":
      return "386";
    case "64":
      return "amd64";
    case "aarch64":
      return "arm64";
    default:
      return arch;
  }
};

export default new r.Recipe({
  name: "task",
  about: {
    summary: "A task runner / simpler Make alternative written in Go.",
    homepage: "https://taskfile.dev/",
    repository: `https://github.com/${OWNER}/${REPO}`,
    license: "MIT",
  },
  platforms: ["win-32", "linux-32", ...r.commonPlatforms],
  versions: r.ghTags(OWNER, REPO),
  sources: r.ghReleaseSrc({
    owner: OWNER,
    repo: REPO,
    checksumFilename: "task_checksums.txt",
    filenames: [({ os, arch, unix }) => `task_${MAPPED_OS(os)}_${MAPPED_ARCH(arch)}.${unix ? "tar.gz" : "zip"}`],
  }),
  build: {
    script: async ({ prefixDir, unix, exe }) => {
      const dst = r.path.join(prefixDir, "bin", exe("task"));
      await r.moveGlob("./task*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  test: {
    script: async ({ version, exe }) => {
      const task = r.path.join("..", "..", "bin", exe("task"));

      if (!await r.exists(task)) {
        throw new Error(`failed to locate binary in package`);
      }

      const actualVersion = (await r.shell.$`${task} --version`)
        .match(/v\d+\.\d+\.\d+/)?.at(0) ?? "";

      if (!r.semver.eq(r.semver.parse(actualVersion), version)) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
