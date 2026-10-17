# Recipe Plan: binaryen

> **Skill reference:** [.apm/skills/forge-recipe/SKILL.md](../../../../.apm/skills/forge-recipe/SKILL.md)\
> **DSL reference:**
> [.apm/skills/forge-recipe/references/recipe-dsl-reference.md](../../../../.apm/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:**
> [.apm/skills/forge-recipe/references/recipe-examples.md](../../../../.apm/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                                                    |
| ----------- | ---------------------------------------------------------------------------------------- |
| Name        | `binaryen`                                                                               |
| Upstream    | https://github.com/WebAssembly/binaryen                                                  |
| Description | Compiler and toolchain infrastructure library for WebAssembly (`wasm-opt`, `wasm-merge`) |
| License     | `Apache-2.0`                                                                             |
| Homepage    | https://github.com/WebAssembly/binaryen                                                  |

## Why a recipe (rather than conda-forge)

`extism-js` (see `forge/github.com/extism/js-pdk/extism-js/PLAN.md`) needs `wasm-merge` and `wasm-opt` on `PATH`. Its
installer pins `version_125`. conda-forge's `binaryen` is stale (max 121) and has no `win-arm64` build. Upstream
publishes pre-built binaries for every platform we target. Because brads-forge wins under strict channel priority, this
package shadows conda-forge's.

## Version Source

- **Method:** GitHub tags (`r.latestGithubTag`)
- **Tag format:** `version_133` (plain integer; `r.coerceSemVer` yields `133.0.0`)
- **Filter:** `tagFilter: /^version_\d+$/` (excludes any `-rc`/other tags)
- **Owner/Repo:** `WebAssembly` / `binaryen`

## Source Assets

- **Release page:** https://github.com/WebAssembly/binaryen/releases
- **Asset naming pattern:** `binaryen-version_{N}-{arch}-{os}.tar.gz` (checksum: `<asset>.sha256`, format
  `<hash>  <filename>`, the default extractor should work)
- **Archive format:** `.tar.gz`, single top-level dir `binaryen-version_{N}/` containing `bin/`, `lib/`, `include/`
- **Checksum strategy:** per-asset `.sha256`

### OS Mapping

| Pixi OS | Asset string |
| ------- | ------------ |
| `linux` | `linux`      |
| `osx`   | `macos`      |
| `win`   | `windows`    |

### Arch Mapping

Upstream is inconsistent: Linux arm uses `aarch64`, macOS/Windows arm use `arm64`.

| Pixi Arch | Asset string             |
| --------- | ------------------------ |
| `64`      | `x86_64`                 |
| `aarch64` | `aarch64` (linux only)   |
| `arm64`   | `arm64` (macos, windows) |

Use a `fileName` builder if `osMap`/`archMap` alone can't express the linux/aarch64 vs mac/arm64 split.

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64
- [x] osx-arm64
- [x] win-64
- [x] win-arm64

## Build Steps

1. Archive auto-extracts; tools live at `./binaryen-version_*/bin/`.
2. Move every tool in `bin/` (`wasm-opt`, `wasm-merge`, `wasm-as`, `wasm-dis`, `wasm2js`, `wasm-split`, ...) to
   `$PREFIX/bin/` (with `.exe` on Windows via `exe()`), except `binaryen-unittests` and the `wasm-fuzz-*` dev tools.
3. `chmod 755` on Unix.
4. Also ship `include/` and `lib/libbinaryen.a` into `$PREFIX`? **Open question** below.

## Runtime Dependencies

None (static binaries). `dynamic_linking: { binary_relocation: false }`; if the linker check complains about overlinking
on Linux/macOS, add `overlinking_behavior: "ignore"` as the `extism` recipe does.

## Test Strategy

- **Command:** `wasm-opt --version` → `wasm-opt version 133 (version_133)`
- **Validation:** `r.coerceSemVer(output) === pkgVersion` (133.0.0). If coerce picks up the wrong number, parse
  `/version (\d+)/` and compare to `${n}.0.0`.
- Also run `wasm-merge --version` to prove both tools extract.

## Verification Steps

```bash
task generate RECIPE=forge/github.com/WebAssembly/binaryen/recipe.ts
ls forge/github.com/WebAssembly/binaryen/generated/
task dryrun RECIPE=forge/github.com/WebAssembly/binaryen/recipe.ts
```

## Open Questions

- Ship only `bin/` or also `include/` + `lib/libbinaryen.a`? (Default proposal: `bin/` only, since extism-js doesn't
  need the rest.)
- Which tools to ship? (Default proposal: all except `binaryen-unittests` and `wasm-fuzz-*`.)
