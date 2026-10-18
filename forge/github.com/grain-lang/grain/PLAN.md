# Build Plan: grain

General reference for the recipe DSL and library helpers: the `forge-recipe` skill
(`xcaf/skills/forge-recipe/forge-recipe.xcaf`).

## Package Summary

- **Name:** `grain`
- **Upstream:** https://github.com/grain-lang/grain
- **Homepage:** https://grain-lang.org
- **Description:** The Grain compiler and CLI. Grain is a strongly typed functional language that compiles to
  WebAssembly.
- **License:** MIT
- **Binary:** `grain` (`grain.exe` on Windows). The release binary is a self-contained
  [`pkg`](https://github.com/vercel/pkg) build of the Node.js CLI, so no runtime dependencies are needed.

## Version Source

The repo is a release-please monorepo with several tag families that share one version number:

- `grain-v0.7.2` (the one we want, and the tag the binary assets are attached to)
- `stdlib-v0.7.2`, `@grain/compiler-v0.4.6`, plus a floating `preview` tag and the odd bare `v0.1.0`/`v0.2.0`

The default `latestGithubTag` filter (no `-`) is not enough, since `stdlib-v*` and `@grain/compiler-v*` would compete.
Use an explicit filter:

```typescript
version: r.latestGithubTag({ owner, repo, tagFilter: /^grain-v\d+\.\d+\.\d+$/ }),
```

`coerceSemVer("grain-v0.7.2")` yields `0.7.2`.

## Source Assets

Per `.github/workflows/upload-binaries.yml`, each release carries bare executables (no archive):

| Asset               | Platform   |
| ------------------- | ---------- |
| `grain-linux-x64`   | `linux-64` |
| `grain-mac-x64`     | `osx-64`   |
| `grain-win-x64.exe` | `win-64`   |

- **Checksums:** none published. `githubReleaseAssets` falls back to the GitHub API `digest` field, then to downloading
  the asset and hashing it, so no checksum options are needed.
- **Mappings:** `osMap: { osx: "mac" }`, `archMap: { "64": "x64" }`. `linux` and `win` already match as-is.
- **No `fileName` override** is needed; the default OS/arch substring matching is unambiguous for these three names.

## Build Steps

rattler-build does not extract a bare executable; it is copied to `$SRC_DIR/<asset name>/<asset name>`.

1. `r.moveGlob("./grain-*/grain-*", $PREFIX/bin/grain[.exe])`
2. `chmod 755` on unix.

`binary_relocation: false` (pre-built binary).

## Test Strategy

`grain --version` prints the bare version (e.g. `0.7.2`). Compare via `r.coerceSemVer()` against `pkgVersion`, as in the
other recipes.

## Supported Platforms

`linux-64`, `osx-64`, `win-64`.

Upstream publishes no arm64 binaries (the `pkg` targets are all `x64`). `osx-arm64` users can run the `osx-64` package
under Rosetta, but the forge will not publish a native `osx-arm64` or `linux-aarch64` package. Compiling from source
(OCaml/esy) is out of scope.

## Open Questions / Risks

- The `pkg` binary should bundle the standard library; the dry run (`grain --version` only) won't prove that. A stronger
  smoke test (e.g. compiling a trivial `.gr` file) could be added if you want it.
- The GitHub API was not reachable for this repo while planning, so the asset names above come from the upstream release
  workflow rather than a live release listing. `task generate` will confirm them against the real release.

## Verification Steps

```bash
task generate RECIPE=forge/github.com/grain-lang/grain/recipe.ts
task dryrun RECIPE=forge/github.com/grain-lang/grain/recipe.ts
```
