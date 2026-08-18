import * as r from "lib/mod.ts";

const owner = "mvdan";
const repo = "sh";

/**
 * Unlike most recipes in this forge, upstream does not publish a pre-compiled `gosh` binary,
 * only `shfmt`. So we compile `cmd/gosh` from the source tarball using our own `go` toolchain
 * package, cross compiling via GOOS/GOARCH where the CI runner is not native to the target.
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
  name: "gosh",
  version: r.latestGithubTag({ owner, repo, tagFilter: /^v\d+\.\d+\.\d+$/ }),
  // A single, platform independent source tarball, hence `platforms` must be declared explicitly.
  sources: async (tag) => {
    const url = `https://github.com/${owner}/${repo}/archive/refs/tags/${tag}.tar.gz`;
    return { url, sha256: await r.digestFromUrl(url) };
  },
  platforms: ["linux-64", "linux-aarch64", "osx-64", "osx-arm64", "win-64", "win-arm64"],
  about: {
    homepage: "https://pkg.go.dev/mvdan.cc/sh/v3",
    repository: `https://github.com/${owner}/${repo}`,
    documentation: "https://pkg.go.dev/mvdan.cc/sh/v3/interp",
    summary: "A proof of concept POSIX/bash shell built on top of the mvdan/sh interp package",
    description: [
      "`gosh` is a proof of concept shell that uses the [interp](https://pkg.go.dev/mvdan.cc/sh/v3/interp)",
      `package from [${owner}/${repo}](https://github.com/${owner}/${repo}).`,
      "",
      "> Upstream only publishes pre-compiled binaries for `shfmt`, so this package is compiled from source.",
      "",
      "---",
      "",
      await r.http.get(`https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`).text(),
    ].join("\n"),
    license: "BSD-3-Clause",
  },
  requirements: {
    // This is our own `go` package (see `forge/go.dev/go`), which is the official upstream
    // distribution & wins over conda-forge's `go` due to strict channel priority.
    // `go.mod` declares `go 1.25.0`, hence the floor.
    build: ["go >=1.25"],
  },
  build: {
    number: 0,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, srcDir, exe, unix, targetOs, targetArch }) => {
      const goos = goOsMap[targetOs];
      const goarch = goArchMap[targetArch];
      if (!goos || !goarch) throw new Error(`unsupported target platform: ${targetOs}-${targetArch}`);

      const goMod = await r.expandGlobFirst(r.path.join(srcDir, "go.mod")) ??
        await r.expandGlobFirst(r.path.join(srcDir, "*", "go.mod"));
      if (!goMod) throw new Error(`failed to locate go.mod under ${srcDir}`);
      const moduleDir = r.path.dirname(goMod);

      const dst = r.path.join(prefixDir, "bin", exe("gosh"));
      await r.ensureDir(r.path.dirname(dst));

      // Keep every Go cache inside the work dir so nothing leaks into the packaged prefix.
      const goPath = r.path.join(srcDir, ".gopath");

      await r.$`go build -trimpath -ldflags ${"-s -w"} -o ${dst} ./cmd/gosh`
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
    // `gosh` has no `--version` flag (its only flag is `-c`), so we test it functionally instead.
    func: async () => {
      const norm = (v: string) => v.replaceAll("\r\n", "\n").trim();

      const hello = norm(await r.$`gosh -c ${"echo hello from gosh"}`.text());
      if (hello !== "hello from gosh") {
        throw new Error(`unexpected output from gosh: ${hello}`);
      }

      const loop = norm(
        await r.$`gosh -c ${'x=world; for i in 1 2 3; do printf "%s-%s\\n" "$i" "$x"; done'}`.text(),
      );
      if (loop !== "1-world\n2-world\n3-world") {
        throw new Error(`unexpected output from gosh: ${loop}`);
      }
    },
  },
});
