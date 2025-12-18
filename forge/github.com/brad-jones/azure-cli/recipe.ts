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
      // NB: For some odd reason rattler-build is having issues clean up the test dir,
      // some process is holding it open. Python possibly? Or maybe my Go wrapper?
      // Error:   × Test failed: failed to remove directory `D:\a\brads-forge\brads-forge\output\test\test_azure-cliDM9dE8`: The process cannot access the file because it is being used by another process. (os error 32)
      // In any case we know the binary is good, it is tested here:
      // https://github.com/brad-jones/azure-cli/blob/master/.github/workflows/main.yaml#L41
      if (Deno.build.os === "windows") return;

      const versionText = await r.$`az --version`.text();
      const parts = versionText.split("\n")[0].split(" ");
      const binVersion = parts[parts.length - 1];
      if (binVersion !== pkgVersion.split("+")[0]) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
