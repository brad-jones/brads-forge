import * as r from "lib/mod.ts";

const owner = "brad-jones";
const repo = "azure-cli";

export default new r.Recipe({
  name: "azure-cli",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({ owner, repo }),
  about: {
    homepage: "https://learn.microsoft.com/en-us/cli/azure/?view=azure-cli-latest",
    summary:
      "Azure CLI is a cross-platform command-line tool for managing Azure resources with interactive commands or scripts.",
    description: await r.http.get("https://raw.githubusercontent.com/Azure/azure-cli/refs/heads/dev/README.md")
      .text(),
    license: "MIT",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("az"));
      await r.moveGlob("./az*/az*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const versionText = await r.$`az --version`.text();
      const parts = versionText.split(Deno.build.os === "windows" ? "\r\n" : "\n")[0].split(" ");
      const binVersion = parts[parts.length - 1];
      if (binVersion !== pkgVersion.split("+")[0]) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
