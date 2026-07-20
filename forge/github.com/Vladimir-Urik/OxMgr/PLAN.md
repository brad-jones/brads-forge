# Build Plan: OxMgr

> This plan is self-contained and can be executed by an LLM unfamiliar with prior context. For general reference on the
> recipe DSL and available library helpers, see `xcaf/skills/forge-recipe/forge-recipe.xcaf`.

## 1. Package Summary

- **Name:** `oxmgr`
- **Upstream:** https://github.com/Vladimir-Urik/OxMgr
- **Homepage:** https://oxmgr.empellio.com
- **What it does:** Oxmgr is a modern, lightweight process manager written in Rust — a fast, deterministic alternative
  to PM2 for managing any executable across platforms.
- **License:** MIT

## 2. Version Source

Use `r.latestGithubTag({ owner: "Vladimir-Urik", repo: "OxMgr" })`. Tags follow the `vX.Y.Z` pattern (e.g. `v0.5.0`)
with no pre-release/non-semver tags observed in the last 10 releases, so no custom `tagFilter` is required.

## 3. Source Assets

Release assets follow Rust target-triple naming:

```
oxmgr-v{version}-{arch}-{target-triple}.{ext}
```

Examples from `v0.5.0`:

- `oxmgr-v0.5.0-x86_64-unknown-linux-gnu.tar.gz`
- `oxmgr-v0.5.0-aarch64-unknown-linux-gnu.tar.gz`
- `oxmgr-v0.5.0-x86_64-apple-darwin.tar.gz`
- `oxmgr-v0.5.0-aarch64-apple-darwin.tar.gz`
- `oxmgr-v0.5.0-x86_64-pc-windows-msvc.zip`

Note: `*-unknown-linux-musl.tar.gz` variants also exist for both architectures, but must NOT be selected —
conda-forge/pixi environments target glibc (`gnu`), not musl. Each asset also has `.asc` (GPG signature), `.sha256`
(checksum), and `.sha256.asc` siblings, plus `.deb` packages and a top-level `SHA256SUMS`/`SHA256SUMS.asc`. These must
be excluded from platform matching — achieved by using an exact `fileName` matcher (see below) rather than relying on
default substring matching, since substring matching alone would also pick up the `.asc`/`.sha256` siblings of the
correct file.

**No `arm64`/`aarch64` Windows asset is published** — only `win-64` is available for Windows.

Checksum resolution: the GitHub API already returns a `digest` field (sha256) for every asset, which the
`githubReleaseAssets` helper uses automatically — no custom `checksumFileExt`/`checksumExtractor` needed.

### osMap / archMap / fileName

```typescript
osMap: { osx: "apple-darwin", win: "pc-windows-msvc", linux: "unknown-linux-gnu" },
archMap: { "64": "x86_64", "arm64": "aarch64" },
fileName: (v, os, arch) => `oxmgr-${v}-${arch}-${os}.${os === "pc-windows-msvc" ? "zip" : "tar.gz"}`,
```

- `archMap.arm64 -> "aarch64"` is required because upstream always uses the literal string `aarch64` in the filename
  (even for macOS `osx-arm64`), while the internal `githubReleaseAssets` helper corrects the _platform key_ to `arm64`
  for osx. The `fileName` callback receives the corrected/mapped value, so it must be mapped back to `aarch64` to match
  the actual asset name.
- Verified via `gh release view v0.5.0 --repo Vladimir-Urik/OxMgr --json assets` and by downloading sample archives.

## 4. Build Steps

Both `.tar.gz` and `.zip` archives contain a single flat binary at the root (no subdirectory nesting):

- Linux/macOS tarball: `oxmgr` (executable)
- Windows zip: `oxmgr.exe`

Verified via `tar -tzvf` and `unzip -l` on real downloaded assets — both contain exactly one file at the archive root.

Build function:

```typescript
func: async ({ prefixDir, exe, unix }) => {
  const dst = r.path.join(prefixDir, "bin", exe("oxmgr"));
  await r.moveGlob("./oxmgr*/oxmgr*", dst);
  if (unix) await Deno.chmod(dst, 0o755);
},
```

`dynamic_linking: { binary_relocation: false }` should be set, as is standard for pre-built binaries in this repo.

No runtime dependencies are required — `oxmgr` is a statically-ish linked Rust binary with no documented external tool
dependencies (unlike e.g. `overmind`, which needs `tmux`).

## 5. Test Strategy

Run `oxmgr --version` (confirmed to print `oxmgr 0.5.0` format) and compare the parsed semver against `pkgVersion`:

```typescript
tests: {
  func: async ({ pkgVersion }) => {
    if (r.coerceSemVer(await r.$`oxmgr --version`.text()) !== pkgVersion) {
      throw new Error(`unexpected version returned from binary`);
    }
  },
},
```

## 6. Supported Platforms

Based on `v0.5.0` release assets:

- `linux-64` (x86_64-unknown-linux-gnu)
- `linux-aarch64` (aarch64-unknown-linux-gnu)
- `osx-64` (x86_64-apple-darwin)
- `osx-arm64` (aarch64-apple-darwin)
- `win-64` (x86_64-pc-windows-msvc)

No `win-arm64` support upstream.

## 7. Full Recipe Reference

```typescript
import * as r from "lib/mod.ts";

const owner = "Vladimir-Urik";
const repo = "OxMgr";

export default new r.Recipe({
  name: "oxmgr",
  about: {
    homepage: "https://oxmgr.empellio.com",
    summary:
      "A modern, lightweight process manager written in Rust — a fast, deterministic alternative to PM2 for managing any executable across platforms",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/master/README.md`,
    ).text(),
    license: "MIT",
  },
  version: r.latestGithubTag({ owner, repo }),
  sources: r.githubReleaseAssets({
    owner,
    repo,
    osMap: { osx: "apple-darwin", win: "pc-windows-msvc", linux: "unknown-linux-gnu" },
    archMap: { "64": "x86_64", "arm64": "aarch64" },
    fileName: (v, os, arch) => `oxmgr-${v}-${arch}-${os}.${os === "pc-windows-msvc" ? "zip" : "tar.gz"}`,
  }),
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("oxmgr"));
      await r.moveGlob("./oxmgr*/oxmgr*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`oxmgr --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
```

## 8. Verification Steps

```bash
task generate RECIPE=forge/github.com/Vladimir-Urik/OxMgr/recipe.ts
task dryrun RECIPE=forge/github.com/Vladimir-Urik/OxMgr/recipe.ts
```

Check `forge/github.com/Vladimir-Urik/OxMgr/generated/` for correctness after `task generate`, in particular:

- Each of the 5 platforms resolves to exactly one source asset (no `.asc`/`.sha256` duplicates, no `musl` variants).
- The checksum (`sha256`) is populated for each source.
