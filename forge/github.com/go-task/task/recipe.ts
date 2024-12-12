import * as r from "lib/mod.ts";

const owner = "go-task";
const repo = "task";

export default new r.Recipe({
  name: "task",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "32": "386", "64": "amd64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://taskfile.dev/",
    summary: "A task runner / simpler Make alternative written in Go.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get("https://raw.githubusercontent.com/go-task/task/refs/heads/main/README.md").text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("task"));
      await r.moveGlob("./task*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ exe, pkgVersion }) => {
      const task = r.path.join("bin", exe("task"));

      if (!await r.exists(task)) {
        throw new Error(`failed to locate binary in package`);
      }

      if (r.coerceSemVer(await r.$`${task} --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
