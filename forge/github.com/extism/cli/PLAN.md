# Recipe Plan: extism

> **Skill reference:** [.apm/skills/forge-recipe/SKILL.md](../../../../.apm/skills/forge-recipe/SKILL.md)\
> **DSL reference:**
> [.apm/skills/forge-recipe/references/recipe-dsl-reference.md](../../../../.apm/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:**
> [.apm/skills/forge-recipe/references/recipe-examples.md](../../../../.apm/skills/forge-recipe/references/recipe-examples.md)\
> **Reference recipe (Go source build):** [`forge/github.com/mvdan/sh/gosh/recipe.ts`](../../mvdan/sh/gosh/recipe.ts)

## Package Summary

| Field       | Value                                                              |
| ----------- | ------------------------------------------------------------------ |
| Name        | `extism`                                                           |
| Upstream    | https://github.com/extism/cli                                      |
| Description | Generate Extism plugin scaffolding and manage Extism installations |
| License     | `BSD-3-Clause`                                                     |
| Homepage    | https://github.com/extism/cli                                      |

## Why build from source

The pre-built v1.6.3 release binaries segfault on startup on Linux (even `--version`), see
https://github.com/extism/cli/issues/115. Users report that compiling from source works. Verified locally: building
`./extism` from the v1.6.3 tag with conda-forge Go (1.2x+) produces a working binary with both `CGO_ENABLED=0` and
`CGO_ENABLED=1`, printing `extism version 1.6.3`.

## Version Source

- **Method:** GitHub tags (`r.latestGithubTag`)
- **Tag format:** `v1.6.3`
- **Filter:** `/^v\d+\.\d+\.\d+$/`
- **Owner/Repo:** `extism` / `cli`

## Source Assets

- **Source:** `https://github.com/extism/cli/archive/refs/tags/{tag}.tar.gz` (single, platform independent)
- **Checksum strategy:** `r.digestFromUrl(url)`, awaited inside the `sources` function
- **`platforms` must be declared explicitly** (not inferable from a non platform-keyed source): linux-64, linux-aarch64,
  osx-64, osx-arm64, win-64, win-arm64 (upstream does not ship win-arm64, but pure Go cross compiles to it).

### Go target mapping

| Pixi OS | GOOS      |   | Pixi Arch           | GOARCH  |
| ------- | --------- | - | ------------------- | ------- |
| `linux` | `linux`   |   | `64`                | `amd64` |
| `osx`   | `darwin`  |   | `aarch64` / `arm64` | `arm64` |
| `win`   | `windows` |   |                     |         |

## Build Steps

1. Locate the module root by globbing `go.mod` in `srcDir`, then `*/go.mod` (archive has a top-level dir).
2. Write the tag (without `v`) to `extism/VERSION`, exactly as upstream's `scripts/set-version.sh` does. The file is
   embedded via `go:embed` and otherwise reports `dev`.
3. `go build -trimpath -ldflags "-s -w" -o $PREFIX/bin/extism[.exe] ./extism` with env `GOOS`, `GOARCH`, `CGO_ENABLED=0`
   (matches upstream's release and permits cross compiling), `GOTOOLCHAIN=local`, and `GOPATH`, `GOMODCACHE`, `GOCACHE`
   redirected under `srcDir`.
4. `chmod 755` on Unix.

> Pass the version into the build function via the recipe's available version context (check `recipe-dsl-reference.md`
> for the build-arg name, e.g. `pkgVersion`).

## Requirements

- **Build:** `go >=1.22` (go.mod floor), provided by this forge's own `forge/go.dev/go/recipe.ts` package. It wins over
  conda-forge via strict channel priority, so do not depend on conda-forge's `go-nocgo`/`go-cgo`.
- **Run:** none

## Test Strategy

- **Command:** `extism --version` → `extism version 1.6.3`
- **Validation:** `r.coerceSemVer(output)` equals `pkgVersion`. This also guards against the `dev` VERSION regression.

## Verification Steps

```bash
task generate RECIPE=forge/github.com/extism/cli/recipe.ts
ls forge/github.com/extism/cli/generated/
task dryrun RECIPE=forge/github.com/extism/cli/recipe.ts
```

## Open Questions

- If cross compilation with `CGO_ENABLED=0` proves problematic for any target (e.g. win-arm64 or purego on darwin), fall
  back to building natively on the GHA runners. Keep `CGO_ENABLED=0` if at all possible.
