import * as r from "lib/mod.ts";

const owner = "extism";
const repo = "cli";

/**
 * The pre-built upstream Linux binaries segfault on startup (https://github.com/extism/cli/issues/115),
 * so we compile from the source tarball instead.
 */
const goOsMap: Partial<Record<r.PlatformOs, string>> = {
  linux: "linux",
  osx: "darwin",
  win: "windows",
};

const goArchMap: Partial<Record<r.PlatformArch, string>> = {
  "64": "amd64",
  "arm64": "arm64",
  "aarch64": "arm64",
};

export default new r.Recipe({
  name: "extism",
  version: r.latestGithubTag({ owner, repo, tagFilter: /^v\d+\.\d+\.\d+$/ }),
  sources: async (tag) => {
    const url = `https://github.com/${owner}/${repo}/archive/refs/tags/${tag}.tar.gz`;
    return { url, sha256: await r.digestFromUrl(url) };
  },
  platforms: ["linux-64", "linux-aarch64", "osx-64", "osx-arm64", "win-64", "win-arm64"],
  about: {
    homepage: `https://github.com/${owner}/${repo}`,
    summary: "Generate Extism plugin scaffolding and manage Extism installations",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/main/README.md`,
    ).text(),
    license: "BSD-3-Clause",
  },
  requirements: {
    // Our own `go` package (see `forge/go.dev/go`), which wins over conda-forge due to strict channel priority.
    build: ["go >=1.22"],
  },
  build: {
    number: 0,
    // purego dlopens extism's runtime library, so the binary links libdl even with CGO_ENABLED=0.
    dynamic_linking: { binary_relocation: false, overlinking_behavior: "ignore" },
    func: async ({ prefixDir, srcDir, exe, unix, targetOs, targetArch, pkgVersion }) => {
      const goos = goOsMap[targetOs];
      const goarch = goArchMap[targetArch];
      if (!goos || !goarch) throw new Error(`unsupported target platform: ${targetOs}-${targetArch}`);

      const goMod = await r.expandGlobFirst(r.path.join(srcDir, "go.mod")) ??
        await r.expandGlobFirst(r.path.join(srcDir, "*", "go.mod"));
      if (!goMod) throw new Error(`failed to locate go.mod under ${srcDir}`);
      const moduleDir = r.path.dirname(goMod);

      // Embedded via go:embed; upstream's release process stamps it the same way.
      await Deno.writeTextFile(r.path.join(moduleDir, "extism", "VERSION"), pkgVersion);

      const dst = r.path.join(prefixDir, "bin", exe("extism"));
      await r.ensureDir(r.path.dirname(dst));

      const goPath = r.path.join(srcDir, ".gopath");

      await r.$`go build -trimpath -ldflags ${"-s -w"} -o ${dst} ./extism`
        .cwd(moduleDir)
        .env({
          GOOS: goos,
          GOARCH: goarch,
          CGO_ENABLED: "0",
          GOTOOLCHAIN: "local",
          GOPATH: goPath,
          GOMODCACHE: r.path.join(goPath, "pkg", "mod"),
          GOCACHE: r.path.join(srcDir, ".gocache"),
          GOBIN: "",
        });

      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`extism --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
