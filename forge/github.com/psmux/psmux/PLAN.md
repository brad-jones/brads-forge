# Build Plan: psmux

> This plan follows the `forge-recipe` skill (`xcaf/skills/forge-recipe/forge-recipe.xcaf`). Refer to it for general
> guidance on the recipe DSL and available `lib/mod.ts` helpers. This plan is self-contained and can be executed by any
> LLM without further context.

## 1. Package Summary

- **Name:** `psmux`
- **Upstream:** https://github.com/psmux/psmux
- **Homepage:** https://psmux.pages.dev/
- **What it does:** A native Windows terminal multiplexer written in Rust. It speaks the tmux command language, reads
  `.tmux.conf`, and supports tmux themes/plugins — all without WSL/Cygwin/MSYS2, using Windows ConPTY directly. The
  release archive ships three binaries that are all the same executable: `psmux.exe`, `pmux.exe`, and `tmux.exe` (an
  alias so users can just type `tmux`).
- **License:** MIT (confirmed via repo `LICENSE` file).
- **Windows-only:** There are no Linux or macOS builds/assets — this is a Windows-only package.

## 2. Version Source

Use `r.latestGithubTag({ owner: "psmux", repo: "psmux" })`. Tags are plain semver with a `v` prefix (e.g. `v3.3.6`), no
pre-release tags observed. No custom tag filter is needed.

## 3. Source Assets

Each GitHub release publishes 6 assets. Only the 3 `.zip` files are relevant (the `-setup.exe` files are NSIS
installers, not used here):

```
psmux-v3.3.6-arm64-setup.exe        <- ignore (installer)
psmux-v3.3.6-windows-arm64.zip      <- win-arm64
psmux-v3.3.6-windows-x64.zip        <- win-64
psmux-v3.3.6-windows-x86.zip        <- win-32
psmux-v3.3.6-x64-setup.exe          <- ignore (installer)
psmux-v3.3.6-x86-setup.exe          <- ignore (installer)
```

- Use `r.githubReleaseAssets({ owner, repo, archMap: { "32": "x86" } })`.
  - No `osMap` is required: the default pixi os key `"win"` is already a substring of `"windows"`, so it matches the zip
    asset names as-is.
  - No `archMap` entry is required for `"64"` (matches `"x64"` via the raw `"64"` substring) or `"arm64"` (matches
    `"arm64"` directly). Only `"32"` needs an explicit map to `"x86"` since the default raw substring `"32"` does not
    appear in `windows-x86.zip`.
  - The `-setup.exe` installer assets do not contain `"win"`/`"windows"` in their names (e.g.
    `psmux-v3.3.6-x64-setup.exe`), so they are automatically excluded from OS matching and never picked up.
- **Checksums:** No separate checksum file is published. The GitHub API returns a `digest` field per release asset
  (SHA-256), and `githubReleaseAssets` automatically uses this when present — no `checksumFileExt`/`checksumExtractor`
  config needed.
- **Target platforms:** `win-32`, `win-64`, `win-arm64` (the CI matrix in `.github/workflows/main.yaml` builds `win-32`
  alongside `win-64`/`win-arm64` on `windows-latest`, so all three should be published).

## 4. Build Steps

Each zip extracts to a flat structure containing `LICENSE`, `README.md`, and the three executables `pmux.exe`,
`psmux.exe`, `tmux.exe` (all identical in size — the same binary, dispatching behavior based on argv0/exe name).

In `build.func`:

1. Move `psmux.exe` from the extracted source to `$PREFIX/Library/bin/psmux.exe` (or `$PREFIX/bin` — check what other
   Windows recipes use; typically pixi puts Windows binaries directly under `$PREFIX/bin` via the `exe()` helper:
   `r.path.join(prefixDir, "bin", exe("psmux"))`).
2. Also move/copy `pmux.exe` and `tmux.exe` to the same `bin` directory so all three commands are available after
   install (this mirrors how the upstream zip distribution works and matches the "psmux ships with tmux and pmux
   aliases" behavior documented in the README).
3. No `chmod` step is needed since `unix` will be `false` for all win-* targets.

Example:

```typescript
func: async ({ prefixDir, exe }) => {
  const binDir = r.path.join(prefixDir, "bin");
  await r.moveGlob("./psmux*/psmux.exe", r.path.join(binDir, exe("psmux")));
  await r.moveGlob("./psmux*/pmux.exe", r.path.join(binDir, exe("pmux")));
  await r.moveGlob("./psmux*/tmux.exe", r.path.join(binDir, exe("tmux")));
},
```

> Note: confirm the actual `target_directory` used by `githubReleaseAssets` (it defaults to the asset file name, e.g.
> `./psmux-v3.3.6-windows-x64.zip/...`) by checking the generated recipe YAML after running `task generate`, and adjust
> the glob pattern accordingly if `./psmux*/...` doesn't match.

## 5. Test Strategy

The binary always prints `tmux <version>` regardless of which of the three exe names is invoked — this is intentional,
hardcoded in upstream `src/cli.rs`/`print_version()` for tmux-compatibility (verified directly in the psmux source on
GitHub). So:

```typescript
tests: {
  func: async ({ pkgVersion }) => {
    for (const bin of ["psmux", "pmux", "tmux"]) {
      const out = await r.$`${bin} --version`.text();
      if (r.coerceSemVer(out) !== pkgVersion) {
        throw new Error(`unexpected version returned from ${bin}: ${out}`);
      }
    }
  },
},
```

`r.coerceSemVer` should correctly extract `3.3.6` from the string `tmux 3.3.6`.

## 6. Supported Platforms

`win-32`, `win-64`, `win-arm64` only. No `linux-*` or `osx-*` sources exist upstream, so leave `platforms` unset (it
will be inferred from the sources map) — or explicitly set `platforms: ["win-32", "win-64", "win-arm64"]` for clarity.

## 7. Metadata

```typescript
about: {
  homepage: "https://psmux.pages.dev/",
  summary: "The real tmux for Windows — a native Windows terminal multiplexer built in Rust.",
  repository: "https://github.com/psmux/psmux",
  description: await r.http.get("https://raw.githubusercontent.com/psmux/psmux/refs/heads/master/README.md").text(),
  license: "MIT",
},
```

## 8. Verification Steps

```bash
task generate RECIPE=forge/github.com/psmux/psmux/recipe.ts
```

Inspect `forge/github.com/psmux/psmux/generated/` for each of `win-32`/`win-64`/`win-arm64` and confirm the source URLs,
sha256 resolution, and build steps look correct.

```bash
task dryrun RECIPE=forge/github.com/psmux/psmux/recipe.ts
```

> **Caveat:** `task dryrun` builds and tests for the _current host platform_ only (`--target-platforms` defaults to the
> machine you're running on). Since psmux is Windows-only, `task dryrun` will only succeed when run from a Windows
> host/runner. On Linux/macOS dev machines, `task generate` is the only viable local verification step — the actual
> build+test will run via CI on `windows-latest` (see `.github/workflows/main.yaml`, which already includes `win-32`,
> `win-64`, `win-arm64` targets in its matrix).
