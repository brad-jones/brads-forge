# Recipe Plan: goreman

> **Skill reference:** [forge-recipe skill](../../../../.claude/skills/forge-recipe/forge-recipe.xcaf) **DSL
> reference:** [recipe-dsl-reference.md](../../../../.claude/skills/forge-recipe/references/recipe-dsl-reference.md)
> **Examples:** [recipe-examples.md](../../../../.claude/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                |
| ----------- | ------------------------------------ |
| Name        | `goreman`                            |
| Upstream    | `https://github.com/mattn/goreman`   |
| Description | Foreman clone written in Go language |
| License     | `MIT`                                |
| Homepage    | `https://github.com/mattn/goreman`   |

## Version Source

- **Method:** GitHub tags
- **Tag format:** `v0.3.19` (standard `vMAJOR.MINOR.PATCH`)
- **Filter:** none needed — all tags observed follow the `vX.Y.Z` pattern
- **Owner/Repo:** `mattn/goreman`

## Source Assets

- **Release page:** https://github.com/mattn/goreman/releases
- **Asset naming pattern:** `goreman_v{version}_{os}_{arch}.{ext}`
  - e.g. `goreman_v0.3.19_darwin_amd64.zip`, `goreman_v0.3.19_linux_amd64.tar.gz`, `goreman_v0.3.19_windows_arm64.zip`
- **Archive format:** platform-dependent — `.tar.gz` on Linux, `.zip` on macOS and Windows
- **Checksum strategy:** no dedicated checksum files are published; GitHub API asset `digest` field (SHA-256) is used
  automatically by `r.githubReleaseAssets` (falls back to downloading the asset to compute the digest if unavailable)

### OS Mapping

| Pixi OS | Asset string                                                  |
| ------- | ------------------------------------------------------------- |
| `linux` | `linux` (default match, no mapping needed)                    |
| `osx`   | `darwin` (needs explicit mapping — default `osx` won't match) |
| `win`   | `windows` (default match works — `"windows".includes("win")`) |

### Arch Mapping

| Pixi Arch           | Asset string                               |
| ------------------- | ------------------------------------------ |
| `64`                | `amd64` (default match, no mapping needed) |
| `arm64` / `aarch64` | `arm64` (default match, no mapping needed) |

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64
- [x] osx-arm64
- [x] win-64
- [x] win-arm64

## Build Steps

1. Extract archive — binary is at `./goreman_v*_*_*/goreman` (executable name has no `.exe` suffix in the archive on any
   platform; `exe()` helper adds `.exe` for the destination on Windows).
2. Move binary to `$PREFIX/bin/goreman` (or `goreman.exe` on Windows) using `r.moveGlob`.
3. `chmod 755` on Unix.
4. No additional env vars, PATH modifications, or symlinks needed.

## Runtime Dependencies

- None. `goreman` is a self-contained Go binary with no runtime dependencies.

## Test Strategy

- **Command:** `goreman version`
- **Expected output format:** plain version string, e.g. `0.3.19` (no `v` prefix, no extra text). Verified locally:
  `./goreman version` → `0.3.19` exit code `0`.
  - Note: `goreman --version` / `goreman -v` are NOT supported (they error with "flag provided but not defined"). Must
    use the `version` subcommand instead.
- **Validation:** Compare `r.coerceSemVer(output)` against `pkgVersion`
- **Platform-specific tests:** none — `version` subcommand behaves the same on all platforms

## Verification Steps

After writing the recipe to `forge/github.com/mattn/goreman/recipe.ts`, run:

```bash
# Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=forge/github.com/mattn/goreman/recipe.ts

# Check generated output
ls forge/github.com/mattn/goreman/generated/

# Build and test locally (current platform only, no upload)
task dryrun RECIPE=forge/github.com/mattn/goreman/recipe.ts
```

### Expected outcomes

- `task generate` should complete without errors and produce YAML files in `generated/`
- `task dryrun` should build and pass tests on the current platform
- If either fails, diagnose the error and update the recipe accordingly

## Open Questions

- None — release asset naming is consistent and fully accounted for above.
