# Recipe Plan: extism-js

> **Skill reference:** [.apm/skills/forge-recipe/SKILL.md](../../../../../.apm/skills/forge-recipe/SKILL.md)\
> **DSL reference:**
> [.apm/skills/forge-recipe/references/recipe-dsl-reference.md](../../../../../.apm/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:**
> [.apm/skills/forge-recipe/references/recipe-examples.md](../../../../../.apm/skills/forge-recipe/references/recipe-examples.md)\
> **Depends on:** [`binaryen` plan](../../../WebAssembly/binaryen/PLAN.md) (must be built and published first)

## Package Summary

| Field       | Value                                                                     |
| ----------- | ------------------------------------------------------------------------- |
| Name        | `extism-js`                                                               |
| Upstream    | https://github.com/extism/js-pdk                                          |
| Description | Compiler that turns JavaScript/TypeScript into Extism WebAssembly plugins |
| License     | `BSD-3-Clause`                                                            |
| Homepage    | https://github.com/extism/js-pdk                                          |

## Version Source

- **Method:** GitHub tags (`r.latestGithubTag`)
- **Tag format:** `v1.7.0`
- **Filter:** `/^v\d+\.\d+\.\d+$/`
- **Owner/Repo:** `extism` / `js-pdk`

## Source Assets

- **Release page:** https://github.com/extism/js-pdk/releases
- **Asset naming pattern:** `extism-js-{arch}-{os}-v{version}.gz` (e.g. `extism-js-x86_64-linux-v1.7.0.gz`)
- **Archive format:** **plain `.gz` single binary** (not auto-extracted; use `r.archive.gunzipFile`)
- **Checksum strategy:** per-asset `.sha256` containing only the raw hex hash → `checksumFileExt: ".sha256"`,
  `checksumExtractor: (txt) => txt.trim()`
- The version in the filename includes the `v` prefix; confirm what `fileName`'s `v` argument contains.

### OS Mapping

| Pixi OS | Asset string |
| ------- | ------------ |
| `linux` | `linux`      |
| `osx`   | `macos`      |
| `win`   | `windows`    |

### Arch Mapping

| Pixi Arch           | Asset string |
| ------------------- | ------------ |
| `64`                | `x86_64`     |
| `arm64` / `aarch64` | `aarch64`    |

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64
- [x] osx-arm64
- [x] win-64
- [x] win-arm64

## Build Steps

1. Locate the `.gz` under the source dir (`./extism-js*/*.gz`).
2. `r.archive.gunzipFile(glob, $PREFIX/bin/extism-js[.exe])`.
3. `chmod 755` on Unix.

## Runtime Dependencies

- `binaryen` (our own recipe; provides `wasm-merge` and `wasm-opt`). Upstream's `install.sh` pins `version_125`, and the
  README requires both on `PATH`. Proposed constraint: `binaryen >=125`.

## Test Strategy

- **Command:** `extism-js --version` (v1.7.0 reports `1.6.1`, so only the `extism-js X.Y.Z` shape is asserted), plus
  `wasm-opt`/`wasm-merge` resolving. `--version` is unsupported).
- **Validation:** `r.coerceSemVer(output) === pkgVersion`.
- Also assert `wasm-opt` and `wasm-merge` resolve on `PATH`.

## Verification Steps

```bash
task generate RECIPE=forge/github.com/extism/js-pdk/extism-js/recipe.ts
ls forge/github.com/extism/js-pdk/extism-js/generated/
task dryrun RECIPE=forge/github.com/extism/js-pdk/extism-js/recipe.ts
```

## Open Questions

- Does the `--version` flag exist and what's its output?
- Is `binaryen >=125` the right floor, or pin to upstream-tested `125`?
