import * as r from "lib/mod.ts";

const owner = "nats-io";
const repo = "natscli";

export default new r.Recipe({
  name: "nats",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "32": "386", "64": "amd64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://nats.io",
    repository: "https://github.com/nats-io/natscli",
    summary: "The NATS Command Line Interface",
    description: await r.http.get("https://raw.githubusercontent.com/nats-io/natscli/refs/heads/main/README.md").text(),
    license: "Apache-2.0",
  },
  build: {
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const bin = r.path.join(prefixDir, "bin", exe("nats"));
      await r.moveGlob("./nats*/nats*", bin);
      if (unix) await Deno.chmod(bin, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`nats --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
