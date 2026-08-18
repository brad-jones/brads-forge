# Recipe Plan: gosh

> **Skill reference:** [forge-recipe skill](../../../../../xcaf/skills/forge-recipe/forge-recipe.xcaf)\
> **DSL reference:**
> [recipe-dsl-reference.md](../../../../../.claude/skills/forge-recipe/references/recipe-dsl-reference.md)\
> **Examples:** [recipe-examples.md](../../../../../.claude/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- |
| Name        | `gosh`                                                                                  |
| Upstream    | `https://github.com/mvdan/sh`                                                           |
| Description | A proof of concept POSIX/bash shell built on top of the `mvdan.cc/sh/v3/interp` package |
| License     | `BSD-3-Clause`                                                                          |
| Homepage    | `https://pkg.go.dev/mvdan.cc/sh/v3`                                                     |

> **This recipe is different from most in this repo.** Upstream only publishes pre-built binaries for `shfmt` — `gosh`
> (`cmd/gosh`) is _not_ released as a binary asset. Therefore this recipe **compiles `gosh` from source** with the Go
> toolchain from conda-forge rather than downloading a release asset.

## Version Source

- **Method:** GitHub tags (`r.latestGithubTag`)
- **Owner/Repo:** `mvdan` / `sh`
- **Tag format:** `v3.13.1` (leading `v`, module major `v3`)
- **Filter:** `/^v\d+\.\d+\.\d+$/` — the repo also carries pre-release style tags such as `v3.6.0-0.dev` and
  `v3.5.0-0.dev` which must be excluded. (The library default already drops any tag containing `-`, but the explicit
  regex makes the intent obvious and future-proof.)
- **Note:** `gosh` has no independent version number. It is versioned by the `mvdan.cc/sh/v3` module release it ships
  in, so the conda package version tracks the `mvdan/sh` tag (e.g. `3.13.1`).

## Source Assets

- **Release page:** https://github.com/mvdan/sh/releases (only `shfmt_*` assets — not usable here)
- **Source used:** GitHub auto-generated source tarball `https://github.com/mvdan/sh/archive/refs/tags/{tag}.tar.gz`
- **Archive format:** `.tar.gz` (auto-extracted by rattler-build; contains a single top level directory named
  `sh-{version-without-v}`)
- **Checksum strategy:** computed at generate time with `r.digestFromUrl(url)` — GitHub's auto-generated tarballs are
  byte-stable, and the generated `recipe.yaml` pins the resulting sha256.
- **Important:** because the source is a single, platform-independent tarball (not a `Record<Platform, Source[]>`),
  `Recipe#getPlatforms()` cannot infer the platform list. The recipe **must** declare `platforms` explicitly, otherwise
  `scripts/build.ts` skips every target.
- **Also important:** `sha256` is only auto-awaited by the library for the platform-keyed source shape. For a single
  source object the `sha256` must already be a resolved `string`, so `sources` is an `async` function that awaits
  `r.digestFromUrl()` itself.

### Go cross-compilation mapping

The build happens on the CI runner's native platform and cross-compiles via `GOOS`/`GOARCH` (`CGO_ENABLED=0`, so
cross-compiling is free). CI matrix (`.github/workflows/main.yaml`): `ubuntu-latest` → linux targets, `windows-latest` →
win targets, `macos-15-intel`/`macos-latest` → osx targets. So the only true cross-compiles are
`linux-64 → linux-aarch64` and `win-64 → win-arm64`.

| Pixi OS | `GOOS`    |
| ------- | --------- |
| `linux` | `linux`   |
| `osx`   | `darwin`  |
| `win`   | `windows` |

| Pixi Arch | `GOARCH` |
| --------- | -------- |
| `64`      | `amd64`  |
| `arm64`   | `arm64`  |
| `aarch64` | `arm64`  |

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64
- [x] osx-arm64
- [x] win-64
- [x] win-arm64

`linux-32` / `win-32` are intentionally excluded (not worth supporting, and the Go toolchain package is not published
for them on conda-forge either).

## Build Requirements

| Package          | Section | Why                                                                                                                                                                                                                                                                                                 |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `go >=1.25`      | `build` | The Go toolchain. This forge **already publishes its own `go` package** (see `forge/go.dev/go/recipe.ts`) — the official upstream distribution, installed to `$PREFIX/go` with `$GOROOT/bin` prepended to `PATH` via an activation script. `go.mod` declares `go 1.25.0`, hence the `>=1.25` floor. |
| `deno=<version>` | `build` | Added automatically by the library because the recipe uses `build.func` / `tests.func`.                                                                                                                                                                                                             |

> **Do not use conda-forge's `go-nocgo` / `go-cgo`.** `rattler-build` is invoked with strict channel priority and
> `brads-forge` ahead of `conda-forge` (see `scripts/build.ts`). Because `brads-forge` already owns the package name
> `go`, conda-forge's `go-nocgo` can never satisfy its exact `go ==<version> <build>` pin and the solve fails with
> `"go X.Y.Z is excluded because due to strict channel priority"`.

`gosh` and all of its dependencies (`golang.org/x/term`, `golang.org/x/sys`) are pure Go, so `CGO_ENABLED=0` is used and
no C toolchain is required.

Build requirements are resolved against the **build** platform, so cross-compiled targets (`linux-aarch64` from a
`linux-64` runner, `win-arm64` from a `win-64` runner) need no extra work.

## Runtime Dependencies

None. `gosh` is a statically linked, pure-Go binary. It shells out to external commands the same way any shell does, but
has no hard dependency of its own.

## Build Steps

1. Locate the module root — the extracted tarball yields `./sh-{version}/` containing `go.mod`. Probe `./go.mod` first
   (in case rattler-build ever strips the leading directory), then `./*/go.mod`.
2. Point Go's caches at the work dir so nothing leaks into `$PREFIX`:
   - `GOPATH` → `<srcDir>/.gopath`
   - `GOMODCACHE` → `<srcDir>/.gopath/pkg/mod`
   - `GOCACHE` → `<srcDir>/.gocache`
   - `GOBIN` → cleared (we always pass an explicit `-o`)
   > Our `go` package's activation script sets `GOBIN=$GOROOT/bin` and `GOMODCACHE=$CONDA_PREFIX/var/cache/go/pkg/mod`,
   > both of which point inside the **build** prefix, so overriding them keeps the build hermetic and self-cleaning.
3. `CGO_ENABLED=0`, `GOOS`/`GOARCH` from the target platform, `GOTOOLCHAIN=local` so the build never silently downloads
   a different toolchain than the one pinned by `requirements.build`.
4. `go build -trimpath -ldflags "-s -w" -o $PREFIX/bin/gosh[.exe] ./cmd/gosh`
5. `chmod 0755` the resulting binary on unix.

> **Network access:** `go build` downloads the module dependencies from `proxy.golang.org` during the build.
> rattler-build does not sandbox network access, so this works, but it is a deliberate departure from the "download a
> pre-built asset" pattern used by every other recipe here.

## Test Strategy

`gosh` has **no `--version` flag** (its only flag is `-c`), so the usual `coerceSemVer(<bin> --version) === pkgVersion`
check is impossible. Instead the tests exercise the interpreter functionally:

1. `gosh -c 'echo hello from gosh'` → must print `hello from gosh`
2. `gosh -c 'x=world; for i in 1 2 3; do printf "%s-%s\n" "$i" "$x"; done'` → must print `1-world`, `2-world`, `3-world`
   — exercises parameter expansion, loops and `printf`, i.e. the `interp` package proper rather than just an `echo`
   passthrough.

Both assertions trim trailing whitespace and normalise `\r\n` so they pass on Windows too.

Tests only run for natively-built targets (`rattler-build ... --test native`), so the cross-compiled `linux-aarch64` /
`win-arm64` artifacts are not executed at build time.

## Verification Steps

```bash
# Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=forge/github.com/mvdan/sh/gosh/recipe.ts

# Check generated output
ls forge/github.com/mvdan/sh/gosh/generated/

# Build and test locally (current platform only, no upload)
task dryrun RECIPE=forge/github.com/mvdan/sh/gosh/recipe.ts
```

### Expected outcomes

- `task generate` emits a `recipe.yaml` per platform under `generated/<platform>/<version>-<buildno>/` containing the
  pinned tarball URL + sha256, `requirements.build: [deno=<ver>, go >=1.25]`, and a `build.script` that shells out to
  `deno run ... recipe.ts execute --build`.
- `task dryrun` compiles `gosh` and both functional tests pass.

> If `task generate` fails with `401 Bad credentials`, the `GITHUB_TOKEN` in the repo root `.env` has expired — refresh
> it (e.g. from `gh auth token`) and re-run.

### Verified results (2026-08-18, v3.13.1)

- `task generate` → `recipe.yaml` written for all 6 platforms.
- `task dryrun` → built `gosh-3.13.1-h81b34b9_0.conda` (1.31 MiB) on `linux-64` using `go 1.26.6` from `brads-forge`;
  both functional tests passed. Test failure behaviour was also confirmed by temporarily inverting an assertion.

## Assumptions Made

- The recipe lives at `forge/github.com/mvdan/sh/gosh/recipe.ts` — i.e. the layout gains an optional **package-name
  level** (`<domain>/<owner>/<repo>/<package-name>/`) because `mvdan/sh` produces more than one packageable command.
  `shfmt` therefore has an obvious future home at `forge/github.com/mvdan/sh/shfmt/`.
- Package version tracks the `mvdan/sh` module tag, since `gosh` has no version of its own.
- `shfmt` is deliberately **not** packaged here — if it is ever wanted it should be its own recipe consuming the
  published release assets.
