import * as r from "lib/mod.ts";

const owner = "microsoft";
const repo = "apm";

export default new r.Recipe({
  name: "apm",
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { "osx": "darwin", "win": "windows" },
    archMap: { "64": "x86_64", "aarch64": "arm64" },
  }),
  about: {
    homepage: "https://microsoft.github.io/apm/",
    repository: `https://github.com/${owner}/${repo}`,
    summary: "Agent Package Manager (APM) — a CLI for managing AI agent packages",
    description: await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`)
      .text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, exe, unix }) => {
      // The release archives are PyInstaller "onedir" bundles: the executable sits
      // alongside a required `_internal/` directory (bundled CPython + deps) and
      // resolves it relative to its own location. Install the whole bundle intact
      // under libexec, then link the executable onto PATH.
      const extractedDir = await r.expandGlobFirst("./apm-*", { breakOnDirOrFile: "dir" });
      if (!extractedDir) throw new Error(`extractedDir undefined`);

      const libexecDir = r.path.join(prefixDir, "libexec", "apm");
      await r.move(extractedDir, libexecDir);

      const bin = r.path.join(libexecDir, exe("apm"));
      if (unix) await Deno.chmod(bin, 0o755);

      const binDir = r.path.join(prefixDir, "bin");
      await r.ensureDir(binDir);
      await r.activation.addLink(bin, r.path.join(binDir, exe("apm")));
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      const output = await r.$`apm --version`.text();
      const version = output.match(/version ([\d.]+)/)?.[1];
      if (!version || r.coerceSemVer(version) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
