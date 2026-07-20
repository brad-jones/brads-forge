import * as r from "lib/mod.ts";

const owner = "psmux";
const repo = "psmux";

export default new r.Recipe({
  name: "psmux",
  platforms: ["win-32", "win-64", "win-arm64"],
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    // NB: No osMap needed, the default pixi os key "win" is already a
    // substring of "windows" used in the asset names. Same goes for the
    // "64" & "arm64" archs, only "32" needs mapping to "x86".
    // The `*-setup.exe` NSIS installer assets don't contain "windows" in
    // their name so they never match and are naturally excluded.
    archMap: { "32": "x86" },
  }),
  about: {
    homepage: "https://psmux.pages.dev/",
    summary: "The real tmux for Windows — a native Windows terminal multiplexer built in Rust.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`)
      .text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe }) => {
      // The zip contains 3 identical binaries (psmux.exe, pmux.exe,
      // tmux.exe) - psmux ships tmux/pmux aliases so users can just type
      // `tmux` and it works.
      const binDir = r.path.join(prefixDir, "bin");
      await r.moveGlob("./psmux*/psmux.exe", r.path.join(binDir, exe("psmux")));
      await r.moveGlob("./psmux*/pmux.exe", r.path.join(binDir, exe("pmux")));
      await r.moveGlob("./psmux*/tmux.exe", r.path.join(binDir, exe("tmux")));
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      // All 3 binaries always print "tmux <version>" regardless of the exe
      // name invoked - hardcoded upstream in src/cli.rs's print_version()
      // for tmux-compatibility.
      for (const bin of ["psmux", "pmux", "tmux"]) {
        const out = await r.$`${bin} --version`.text();
        if (r.coerceSemVer(out) !== pkgVersion) {
          throw new Error(`unexpected version returned from ${bin}: ${out}`);
        }
      }
    },
  },
});
