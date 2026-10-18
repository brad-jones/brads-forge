# Recipe Plan: moonbit

> **Skill reference:** [forge-recipe skill](../../../.apm/skills/forge-recipe/SKILL.md)

## Package Summary

| Field    | Value                                                                   |
| -------- | ----------------------------------------------------------------------- |
| Name     | `moonbit`                                                               |
| Upstream | <https://www.moonbitlang.com/download/>                                 |
| About    | The MoonBit toolchain: `moon` build system, `moonc` compiler, LSP & co. |
| License  | `LicenseRef-MoonBit-Public-Source-License`, see below                   |

The compiler is under the [MoonBit Public Source License][mpsl] (a relaxed SSPL with no SPDX identifier). The recipe
schema has no `license_url`, so the identifier is a `LicenseRef-`. The core standard library is Apache-2.0 and
`CREDITS.md` lists the bundled third-party components (binaryen, tcc, simdutf).

[mpsl]: https://github.com/moonbitlang/moonbit-compiler/blob/main/LICENSE.TXT

The toolchain is what upstream's `https://cli.moonbitlang.com/install/unix.sh` and `install/powershell.ps1` install into
`~/.moon`. This recipe reproduces those scripts inside a conda prefix.

## Version Source

Tags of <https://github.com/moonbitlang/moonbit-compiler>, via `r.latestGithubTag`. Tags look like `v0.10.15+943464bfa`,
i.e. a semver plus the compiler commit as build metadata. The default tag filter already drops the `-nightly` tags.

- **raw** is the tag minus its leading `v` (`0.10.15+943464bfa`), which is what the download URLs use.
- **semver** drops the build metadata (`0.10.15`). Upstream has occasionally re-tagged the same version with a second
  commit (e.g. two `v0.10.11+...` tags); only one of them is packaged.

Tags are pushed before binaries are uploaded for some old versions (e.g. `0.10.6` has no downloads), but only the latest
version is ever built.

## Source Assets

Everything comes from `https://cli.moonbitlang.com`. In URLs the `+` must be encoded as `%2B`:

| Platform        | Toolchain archive                              | Core archive              |
| --------------- | ---------------------------------------------- | ------------------------- |
| `linux-64`      | `binaries/<raw>/moonbit-linux-x86_64.tar.gz`   | `cores/core-<raw>.tar.gz` |
| `linux-aarch64` | `binaries/<raw>/moonbit-linux-aarch64.tar.gz`  | `cores/core-<raw>.tar.gz` |
| `osx-arm64`     | `binaries/<raw>/moonbit-darwin-aarch64.tar.gz` | `cores/core-<raw>.tar.gz` |
| `win-64`        | `binaries/<raw>/moonbit-windows-x86_64.zip`    | `cores/core-<raw>.zip`    |

- Toolchain checksums: `<archive>.sha256`, formatted `<hash>  <file name>`.
- Core archives have no checksum file, so `r.digestFromUrl` hashes them at generate time.
- The toolchain archive has no top-level directory, so it gets `target_directory: "moonbit"`. The core archive has a
  single `core/` directory, which rattler-build strips, so it gets `target_directory: "core"`.
- `linux-aarch64` additionally pulls the `linux-x86_64` toolchain into `target_directory: "moonbit-host"`. See
  [Build Steps](#build-steps) for why.

## Supported Platforms

`linux-64`, `linux-aarch64`, `osx-arm64`, `win-64`.

- There is no Intel macOS build (`moonbit-darwin-x86_64.tar.gz` is a 403), so no `osx-64`.
- There is no native Windows ARM build, so no `win-arm64`. Upstream's PowerShell installer puts the x86_64 zip on ARM64
  machines and relies on x64 emulation, but this forge only publishes native builds.

## Build Steps

1. Move `./moonbit` to `$PREFIX/moonbit`. It holds `bin/`, `bin/internal/tcc`, `include/`, `lib/`, `share/` and
   `CREDITS.md`, all of which `moon` finds relative to its own executable. Keeping it out of `$PREFIX/{bin,lib,include}`
   avoids clashing with conda-forge files such as `lib/libbacktrace.a` and `share/why3`.
2. Move `./core` to `$PREFIX/moonbit/lib/core`.
3. On unix, `chmod 0o755` everything in `bin/` and `bin/internal/`: the tarballs ship without execute bits.
4. Create `moonx` as a link to `moon` with `r.activation.addLink` (a symlink on unix, a hard link made by the activation
   scripts on Windows). `moon` changes behaviour based on its name, as the install scripts set up.
5. Bundle (pre-compile) the core library, as the install scripts do:
   ```
   moon -C $PREFIX/moonbit/lib/core bundle --warn-list -a --all
   moon -C $PREFIX/moonbit/lib/core bundle --warn-list -a --target wasm-gc --quiet
   ```
   Without this, every build fails looking for `lib/core/_build/<target>/release/bundle/prelude/prelude.mi`. The output
   is target-independent `.core`/`.mi` IR, so `linux-aarch64`, which CI cross-builds on a `linux-64` runner, uses the
   `moonbit-host` toolchain for this step. The bundle is relocatable and works from a read-only prefix (verified by
   moving and `chmod a-w` an install). The bundle step's own `_build/.moon_db` and `_build/.moon-lock` are deleted
   afterwards: they hold build-prefix paths and `moon` doesn't need them to use the bundle.
6. Activation:
   - `MOON_TOOLCHAIN_ROOT=$CONDA_PREFIX/moonbit`, so a `MOON_TOOLCHAIN_ROOT` left over from a `~/.moon` install can't
     point the env's `moon` at a different core.
   - Prepend `$MOON_TOOLCHAIN_ROOT/bin` to `PATH`.
   - `MOON_HOME` is left alone. `moon` keeps only the mooncakes registry index/cache and login credentials there
     (default `~/.moon`), which are fine to share between environments, as with npm's cache in the nodejs recipe.

`dynamic_linking: { binary_relocation: false, overlinking_behavior: "ignore" }`, as for the other upstream binaries.

## Requirements

None. The Linux binaries only link against system `libc`/`libm`; the native backend compiles C with the bundled `tcc` or
the system C compiler.

## Test Strategy

Binaries are called by their full `$PREFIX/moonbit/bin/...` path:

1. `moonc -v` prints `v0.10.15+943464bfa (2026-10-12)`; `r.coerceSemVer` of the part before `+` must equal the package
   version.
2. `moon version --all` succeeds.
3. In a temp dir: `moon new hello`, then `moon run cmd/main` inside it must print `Hello`. This proves the bundled core
   is found from the installed location.

## Verification Steps

```bash
task generate RECIPE=forge/moonbitlang.com/moonbit/recipe.ts
task dryrun RECIPE=forge/moonbitlang.com/moonbit/recipe.ts
```
