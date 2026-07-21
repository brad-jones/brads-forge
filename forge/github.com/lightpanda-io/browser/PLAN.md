# Recipe Plan: lightpanda

> **Skill reference:** [forge-recipe skill](../../../../xcaf/skills/forge-recipe/forge-recipe.xcaf) **DSL reference:**
> [recipe-dsl-reference.md](../../../../.claude/skills/forge-recipe/references/recipe-dsl-reference.md) **Examples:**
> [recipe-examples.md](../../../../.claude/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                           |
| ----------- | --------------------------------------------------------------- |
| Name        | `lightpanda`                                                    |
| Upstream    | `https://github.com/lightpanda-io/browser`                      |
| Description | Lightpanda: the headless browser designed for AI and automation |
| License     | `AGPL-3.0-or-later`                                             |
| Homepage    | `https://lightpanda.io`                                         |

## Version Source

- **Method:** GitHub tags
- **Tag format:** `0.3.5` (no `v` prefix on current releases; older releases used `v0.2.6` and earlier — these will
  simply sort lower and are ignored since the current tags have no `-` in them).
- **Filter:** none needed — default `r.latestGithubTag({ owner, repo })` behavior (excludes tags containing `-`, coerces
  semver, picks highest) works correctly here.
- **Owner/Repo:** `lightpanda-io` / `browser`

## Source Assets

- **Release page:** https://github.com/lightpanda-io/browser/releases
- **Asset naming pattern:** `lightpanda-{arch}-{os}` (note: arch comes before os, unlike the more common
  `{name}-{os}-{arch}` pattern — this doesn't matter since `githubReleaseAssets` matches os/arch via substring, not
  position)
- **Assets present per release** (checked on tag `0.3.5`):
  - `lightpanda-aarch64-linux`
  - `lightpanda-aarch64-macos`
  - `lightpanda-x86_64-linux`
  - `lightpanda-x86_64-macos`
  - `lightpanda_0.3.5_amd64.deb` (ignored — no os/arch substring match, ok to skip)
  - `lightpanda_0.3.5_arm64.deb` (ignored — no os/arch substring match, ok to skip)
- **Archive format:** none — each asset is a raw, uncompressed ELF/Mach-O executable (verified via `file` on a partial
  download). rattler-build will not try to extract these; the file lands as-is under
  `$SRC_DIR/<asset-name>/<asset-name>` because `target_directory` is set to the asset name.
- **Checksum strategy:** GitHub API `digest` field (SHA-256) — returned automatically by `githubReleaseAssets` with no
  extra config needed (verified: `gh api repos/lightpanda-io/browser/releases/tags/0.3.5` returns a `digest` field for
  every asset).
- **No Windows build is published** — Windows platforms are simply omitted (inferred automatically since no `win` assets
  exist).

### OS Mapping

| Pixi OS | Asset string                              |
| ------- | ----------------------------------------- |
| `linux` | `linux` (default, no map needed)          |
| `osx`   | `macos` (needs `osMap: { osx: "macos" }`) |
| `win`   | n/a — not published                       |

### Arch Mapping

| Pixi Arch | Asset string                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| `64`      | `x86_64` (explicit `archMap: { "64": "x86_64" }` for clarity, though default substring match on `"64"` would also work) |
| `aarch64` | `aarch64` (default, no map needed — matches before the `64` check due to array ordering in `allArchitectures`)          |

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64
- [x] osx-arm64
- [ ] win-64 (not published upstream)
- [ ] win-arm64 (not published upstream)

## Build Steps

1. Binary lands at `./lightpanda-*/lightpanda-*` (target_directory == asset name, file == asset name, no extraction
   needed since it's a raw executable).
2. Move it to `$PREFIX/bin/lightpanda` via `r.moveGlob("./lightpanda-*/lightpanda-*", dst)`.
3. `chmod 755` on Unix (all supported platforms are Unix — no Windows build exists).
4. No env vars, PATH changes, or symlinks needed.

## Runtime Dependencies

- None — binary is dynamically linked only against `libc.so.6` / `libm.so.6` (verified via `ldd` on the linux-x86_64
  binary). No conda-forge runtime deps required.

## Test Strategy

- **Command:** `lightpanda version` (note: subcommand, not a flag — verified via `--help`; `lightpanda --version` fails
  with `UnknownCommand`)
- **Expected output format:** bare version string, e.g. `0.3.5` (verified by running the binary directly)
- **Validation:** `r.coerceSemVer(await r.$\`lightpanda version\`.text()) !== pkgVersion` → throw if mismatched
- **Platform-specific tests:** none needed (Unix only)

## Verification Steps

After writing the recipe to `forge/github.com/lightpanda-io/browser/recipe.ts`, run:

```bash
# Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=forge/github.com/lightpanda-io/browser/recipe.ts

# Check generated output
ls forge/github.com/lightpanda-io/browser/generated/

# Build and test locally (current platform only, no upload)
task dryrun RECIPE=forge/github.com/lightpanda-io/browser/recipe.ts
```

### Expected outcomes

- `task generate` should complete without errors and produce YAML files in `generated/` for linux-64, linux-aarch64,
  osx-64, osx-arm64 (no win-64/win-arm64).
- `task dryrun` should build and pass tests on the current platform (linux-64).
- If either fails, diagnose the error and update the recipe accordingly.

## Open Questions

- None — all information needed was determined from the GitHub releases API and by test-downloading/running the
  linux-x86_64 binary.
