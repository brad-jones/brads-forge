import * as r from "lib/mod.ts";

const owner = "ByteNess";
const repo = "aws-vault";

export default new r.Recipe({
  name: "aws-vault",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "amd64" },
  }),
  about: {
    repository: `https://github.com/${owner}/${repo}`,
    summary: "A vault for securely storing and accessing AWS credentials in development environments.",
    description: await r.http.get("https://raw.githubusercontent.com/ByteNess/aws-vault/refs/heads/main/README.md")
      .text(),
    license: "MIT",
  },
  build: {
    number: 2,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("aws-vault"));
      await r.moveGlob("./aws-vault*/aws-vault*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion, exe }) => {
      const awsVault = r.path.join("bin", exe("aws-vault"));
      if (r.coerceSemVer(await r.$`${awsVault} --version`.text("combined")) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
