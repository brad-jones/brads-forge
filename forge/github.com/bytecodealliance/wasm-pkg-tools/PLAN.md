# Recipe Plan: wkg

> **Skill reference:** [.apm/skills/forge-recipe/SKILL.md](../../../../.apm/skills/forge-recipe/SKILL.md)\
> **DSL reference:**
> [.apm/skills/forge-recipe/references/recipe-dsl-reference.md](../../../../.apm/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:**
> [.apm/skills/forge-recipe/references/recipe-examples.md](../../../../.apm/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                 |
| ----------- | ----------------------------------------------------- |
| Name        | `wkg`                                                 |
| Upstream    | https://github.com/bytecodealliance/wasm-pkg-tools    |
| Description | Tooling to package, publish and fetch Wasm components |
| License     | `Apache-2.0`                                          |
| Homepage    | https://github.com/bytecodealliance/wasm-pkg-tools    |

## Version Source

- **Method:** GitHub tags via `r.latestGithubTag`
- **Tag format:** `vX.Y.Z` (e.g. `v0.16.3`)
- **Filter:** none needed

## Source Assets

Raw (non-archived) binaries named `wkg-{arch}-{target-triple}`; no `.exe` suffix on Windows and no checksum files (the
GitHub API `digest` field supplies sha256).

| Platform        | Asset                           |
| --------------- | ------------------------------- |
| `linux-64`      | `wkg-x86_64-unknown-linux-gnu`  |
| `linux-aarch64` | `wkg-aarch64-unknown-linux-gnu` |
| `osx-64`        | `wkg-x86_64-apple-darwin`       |
| `osx-arm64`     | `wkg-aarch64-apple-darwin`      |
| `win-64`        | `wkg-x86_64-pc-windows-gnu`     |

`riscv64gc` is ignored (no conda platform). OS map: `osx: apple-darwin`, `win: pc-windows-gnu`, `linux:
unknown-linux-gnu`. Arch map: `64: x86_64`, `arm64: aarch64`.

## Build Steps

1. Move the downloaded file (`./wkg-*/wkg-*`) to `$PREFIX/bin/wkg` (`wkg.exe` on Windows).
2. `chmod 0755` on unix.

## Test Strategy

`wkg --version` prints `wkg 0.16.3`; compare `r.coerceSemVer` of the output to the package version.

## Verification Steps

```bash
task generate RECIPE=forge/github.com/bytecodealliance/wasm-pkg-tools/recipe.ts
task dryrun RECIPE=forge/github.com/bytecodealliance/wasm-pkg-tools/recipe.ts
```
