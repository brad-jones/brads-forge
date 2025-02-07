import * as r from "lib/mod.ts";

const owner = "pulumi";
const repo = "pulumi";

export default new r.Recipe({
  name: "pulumi",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "x64", "aarch64": "arm64" },
    fileName: (v, os, arch) => `pulumi-${v}-${os}-${arch}.${os === "windows" ? "zip" : "tar.gz"}`,
  }),
  about: {
    homepage: "https://www.pulumi.com",
    repository: "https://github.com/pulumi/pulumi",
    summary: "Infrastructure as Code in any programming language",
    description: await r.http.get("https://raw.githubusercontent.com/pulumi/pulumi/refs/heads/master/README.md").text(),
    license: "Apache-2.0",
  },
  build: {
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, unix }) => {
      const extractedDir = await r.expandGlobFirst("./pulumi*", { breakOnDirOrFile: "dir" });
      if (!extractedDir) throw new Error(`extractedDir undefined`);
      for await (const v of r.walk(extractedDir)) {
        if (v.isDirectory) continue;
        const dst = r.path.join(prefixDir, "bin", v.name);
        await r.move(v.path, dst);
        if (unix) await Deno.chmod(dst, 0o755);
      }
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`pulumi version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
