# Recipe Plan: podplane

> **Skill reference:** [forge-recipe skill](../../../../xcaf/skills/forge-recipe/forge-recipe.xcaf) **DSL reference:**
> [recipe-dsl-reference.md](../../../../xcaf/skills/forge-recipe/references/recipe-dsl-reference.md) **Examples:**
> [recipe-examples.md](../../../../xcaf/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Name        | `podplane`                                                                                                               |
| Upstream    | `https://github.com/podplane/podplane`                                                                                   |
| Description | Podplane is a Kubernetes distribution & PaaS you can deploy in a few minutes to your AWS, GCP, or Proxmox VE environment |
| License     | `Apache-2.0`                                                                                                             |
| Homepage    | `https://podplane.dev`                                                                                                   |

## Version Source

- **Method:** GitHub tags
- **Tag format:** `v0.8.1` (standard semver with `v` prefix)
- **Filter:** none needed — all observed tags are clean release versions
- **Owner/Repo:** `podplane` / `podplane`

## Source Assets

- **Release page:** https://github.com/podplane/podplane/releases
- **Asset naming pattern:** `podplane_{version}_{os}_{arch}.tar.gz` (version has no `v` prefix, e.g.
  `podplane_0.8.1_linux_amd64.tar.gz`)
- **Archive format:** `.tar.gz` (auto-extracted by rattler-build)
- **Checksum strategy:** GitHub API returns a `digest` (SHA-256) field directly on every release asset, so
  `r.githubReleaseAssets()` will use that automatically — no `checksumFilePattern`/`checksumFileExt` override needed.
  (Note: the release also ships a `podplane_{version}_checksums.txt` file, but it uses SHA-512 hashes, so it is
  intentionally NOT used here — the GitHub asset digest takes priority in the DSL's resolution order.)

### OS Mapping

| Pixi OS | Asset string               |
| ------- | -------------------------- |
| `linux` | `linux`                    |
| `osx`   | `darwin`                   |
| `win`   | N/A (unsupported upstream) |

### Arch Mapping

| Pixi Arch           | Asset string |
| ------------------- | ------------ |
| `64`                | `amd64`      |
| `arm64` / `aarch64` | `arm64`      |

### Supported Platforms

- [x] linux-64
- [x] linux-aarch64
- [x] osx-64
- [x] osx-arm64
- [ ] win-64 (no Windows assets published upstream)
- [ ] win-arm64 (no Windows assets published upstream)

## Build Steps

1. Extract archive — contains `LICENSE` and the `podplane` binary at the archive root (verified via
   `tar tzf podplane_0.8.1_linux_amd64.tar.gz`).
2. Move binary to `$PREFIX/bin/podplane` using `r.moveGlob("./podplane_*/podplane", dst)`.
3. `chmod 755` on Unix (no Windows build, so `unix` will always be true for supported platforms).
4. No additional env vars, PATH modifications, or symlinks required.

## Runtime Dependencies

- None. `podplane` is a self-contained Go binary (a CLI for managing Kubernetes deployments).

## Test Strategy

- **Command:** `podplane --version`
- **Expected output format:**
  ```
  podplane CLI v0.8.1
  Version: v0.8.1 (7e1e03f)
  ```
  (verified by downloading and running the v0.8.1 linux-amd64 binary)
- **Validation:** `r.coerceSemVer(await r.$`podplane --version`.text())` should equal `pkgVersion`. `coerceSemVer` uses
  loose semver coercion, so it will pick up the first version-like substring (`v0.8.1` → `0.8.1`) from the multi-line
  output.
- **Platform-specific tests:** None — same command works identically on linux/osx.

## Verification Steps

After writing the recipe to `forge/github.com/podplane/podplane/recipe.ts`, run:

```bash
# Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=forge/github.com/podplane/podplane/recipe.ts

# Check generated output
ls forge/github.com/podplane/podplane/generated/

# Build and test locally (current platform only, no upload)
task dryrun RECIPE=forge/github.com/podplane/podplane/recipe.ts
```

### Expected outcomes

- `task generate` should complete without errors and produce YAML files in `generated/` for linux-64, linux-aarch64,
  osx-64, and osx-arm64 (no win-64/win-arm64 since no Windows assets exist upstream).
- `task dryrun` should build and pass tests on the current platform.
- If either fails, diagnose the error and update the recipe accordingly.

## Open Questions

- None — asset naming, checksum resolution (GitHub digest), and version command output have all been directly verified
  against the v0.8.1 release.
