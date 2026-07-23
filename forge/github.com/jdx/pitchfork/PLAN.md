# Build Plan: pitchfork

> This plan is self-contained. For general reference on the recipe DSL and available library helpers, see
> `xcaf/skills/forge-recipe/forge-recipe.xcaf` (compiled from `.claude/skills/forge-recipe/SKILL.md`).

## 1. Package Summary

- **Name:** `pitchfork`
- **Upstream:** https://github.com/jdx/pitchfork
- **What it does:** A CLI for managing daemons with a focus on developer experience — auto start/stop via shell hook,
  readiness checks (delay, output regex, HTTP, TCP port, custom command), dependency ordering, file watching, cron
  scheduling, lifecycle hooks, resource limits, and a TUI/Web UI. Written in Rust by the maintainer of `mise`.
- **Homepage:** https://pitchfork.jdx.dev/
- **License:** MIT (SPDX: `MIT`)

## 2. Version Source

Use `r.latestGithubTag({ owner: "jdx", repo: "pitchfork" })`. Tags follow a plain `vX.Y.Z` pattern (e.g. `v2.17.0`) with
no pre-release/non-semver tags observed, so no custom `tagFilter` is needed.

## 3. Source Assets

Release assets follow Rust target-triple naming, e.g. for `v2.17.0`:

```
pitchfork-aarch64-apple-darwin.tar.gz
pitchfork-aarch64-pc-windows-msvc.zip
pitchfork-aarch64-unknown-linux-gnu.tar.gz
pitchfork-x86_64-pc-windows-msvc.zip
pitchfork-x86_64-unknown-linux-gnu.tar.gz
```

Note: there is **no `x86_64-apple-darwin` (Intel macOS) asset** — only `aarch64-apple-darwin`. Supported platforms are
therefore:

```
linux-64, linux-aarch64, osx-arm64, win-64, win-arm64
```

(No `osx-64`.)

Use `r.githubReleaseAssets` with:

```typescript
osMap: { "osx": "apple-darwin", "win": "pc-windows-msvc", "linux": "unknown-linux-gnu" },
archMap: { "64": "x86_64" }, // "aarch64" pixi arch already matches the literal "aarch64" in filenames
```

No `fileName` builder needed — default asset name matching (repo name + osMap/archMap substrings) is unambiguous here
since there is exactly one asset per platform.

**Checksums:** No separate `.sha256`/checksums asset is published. However, the GitHub Releases API returns a `digest`
field (sha256) for every asset, and `r.githubReleaseAssets` already prefers that digest automatically when present — no
`checksumFileExt`/`checksumExtractor` configuration is needed.

## 4. Build Steps

Both the `.tar.gz` (Linux/macOS) and `.zip` (Windows) archives are **flat** — verified by extracting the
`x86_64-unknown-linux-gnu` tarball, which contains exactly one file at the root: `pitchfork` (no nested directory).
Assume the same flat layout for the other platform archives (uniform CI release pipeline).

```typescript
func: async ({ prefixDir, exe, unix }) => {
  const dst = r.path.join(prefixDir, "bin", exe("pitchfork"));
  await r.moveGlob("./pitchfork*/pitchfork*", dst);
  if (unix) await Deno.chmod(dst, 0o755);
},
```

`r.moveGlob` auto-extracts `.tar.gz`/`.zip` (rattler-build handles this), so no manual archive extraction step is
required.

## 5. Test Strategy

Verified locally: `pitchfork --version` prints `pitchfork 2.17.0` (repo name + version, space-separated, no `v` prefix).
`r.coerceSemVer()` can extract the semver from this string directly (it internally falls back to `semver.coerce`), so no
manual string splitting is required:

```typescript
tests: {
  func: async ({ pkgVersion }) => {
    if (r.coerceSemVer(await r.$`pitchfork --version`.text()) !== pkgVersion) {
      throw new Error(`unexpected version returned from binary`);
    }
  },
},
```

## 6. Supported Platforms

```
linux-64
linux-aarch64
osx-arm64
win-64
win-arm64
```

(inferred automatically from available sources — no explicit `platforms` field needed)

## 7. Requirements / Post-Install

None. No runtime dependencies, activation env vars, or PATH changes needed.

## 8. Verification Steps

```bash
task generate RECIPE=forge/github.com/jdx/pitchfork/recipe.ts
task dryrun RECIPE=forge/github.com/jdx/pitchfork/recipe.ts
```
