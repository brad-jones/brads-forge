# Recipe Plan: obscura

> **Skill reference:** [forge-recipe skill](../../../../.claude/skills/forge-recipe/forge-recipe.xcaf) **DSL
> reference:** [recipe-dsl-reference.md](../../../../.claude/skills/forge-recipe/references/recipe-dsl-reference.md)
> **Examples:** [recipe-examples.md](../../../../.claude/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                               |
| ----------- | --------------------------------------------------- |
| Name        | `obscura`                                           |
| Upstream    | `https://github.com/h4ckf0r0day/obscura`            |
| Description | The headless browser for AI agents and web scraping |
| License     | `Apache-2.0`                                        |
| Homepage    | `https://obscura.sh`                                |

## Version Source

- **Method:** GitHub tags
- **Tag format:** `v0.1.10` (standard `vX.Y.Z`)
- **Filter:** none needed — all tags observed follow the `vX.Y.Z` pattern
- **Owner/Repo:** `h4ckf0r0day/obscura`

## Source Assets

- **Release page:** https://github.com/h4ckf0r0day/obscura/releases
- **Asset naming pattern:** `obscura-{arch}-{os}.{ext}` e.g. `obscura-x86_64-linux.tar.gz`,
  `obscura-aarch64-macos.tar.gz`, `obscura-x86_64-windows.zip`
- **Archive format:** `.tar.gz` for linux/macos, `.zip` for windows (both auto-extracted by rattler-build)
- **Checksum strategy:** GitHub API asset `digest` field (SHA-256) — no separate checksum file published, handled
  automatically by `r.githubReleaseAssets`

### OS Mapping

| Pixi OS | Asset string                                          |
| ------- | ----------------------------------------------------- |
| `linux` | `linux` (default match, no map needed)                |
| `osx`   | `macos` (needs osMap override)                        |
| `win`   | `windows` (default `win` substring-matches `windows`) |

### Arch Mapping

- No `archMap` needed — asset names contain `aarch64` (matches default arch enum value directly) and `x86_64` (contains
  substring `64`, matching default arch enum value `64`).

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64 (x86_64-macos asset available)
- [x] osx-arm64 (aarch64-macos asset available)
- [x] win-64
- [ ] win-arm64 (no asset published)

## Build Steps

1. Each archive contains two binaries at the top level: `obscura` and `obscura-worker` (`.exe` suffix on Windows).
2. Extract archive — binaries are at `./obscura-*/*` (target directory name equals the asset filename, e.g.
   `obscura-x86_64-linux.tar.gz/`).
3. Move both binaries into `$PREFIX/bin/` using two explicit `r.moveGlob()` calls, one per binary (e.g.
   `r.moveGlob("./obscura-*/obscura", <dst>)`). **Note:** a single glob-to-directory move
   (`r.moveGlob("./obscura-*/*", "<dir>/")`) does NOT work here — `moveGlob`'s multi-file destination logic computes the
   relative path via a naive common-prefix comparison against the _glob pattern string itself_ (which still contains the
   literal `*`), so files end up nested under an extra `<asset-name>/` subdirectory instead of directly in the
   destination dir. Moving each named file individually avoids this.
4. chmod 755 on both binaries for Unix targets.
5. No additional env vars, PATH changes, or symlinks needed.

## Runtime Dependencies

- None — `obscura` and `obscura-worker` are statically built browser/automation binaries with no observed external
  runtime dependency.

## Test Strategy

- **Command:** `obscura --version`
- **Expected output format:** `obscura 0.1.10` (verified via direct binary execution) — parse with `r.coerceSemVer()` on
  the trimmed output and compare to `pkgVersion`.
- **Validation:** `r.coerceSemVer(await r.$`obscura --version`.text()) === pkgVersion`
- **Platform-specific tests:** none additional; same command works cross-platform.

## Verification Steps

After writing the recipe to `forge/github.com/h4ckf0r0day/obscura/recipe.ts`, run:

```bash
# Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=forge/github.com/h4ckf0r0day/obscura/recipe.ts

# Check generated output
ls forge/github.com/h4ckf0r0day/obscura/generated/

# Build and test locally (current platform only, no upload)
task dryrun RECIPE=forge/github.com/h4ckf0r0day/obscura/recipe.ts
```

### Expected outcomes

- `task generate` should complete without errors and produce YAML files in `generated/`
- `task dryrun` should build and pass tests on the current platform
- If either fails, diagnose the error and update the recipe accordingly

## Open Questions

- None — asset naming, checksums, and version output were all directly verified against the v0.1.10 release assets.
