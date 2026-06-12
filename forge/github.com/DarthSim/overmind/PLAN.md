# Build Plan: overmind

## Package Summary

- **Name:** `overmind`
- **Upstream:** https://github.com/DarthSim/overmind
- **Description:** Process manager for Procfile-based applications (uses tmux)
- **License:** MIT

Overmind is a process manager for Procfile-based applications and target tmux. It allows you to start multiple processes
from a `Procfile` in separate tmux windows, providing per-process logs, easy restart, and connection capabilities.

## Version Source

- Tags follow standard semver with `v` prefix: `v2.5.1`, `v2.5.0`, etc.
- No non-release tags or pre-release tags are present.
- Use `r.latestGithubTag({ owner, repo })` with default filtering.

## Source Assets

- **Naming pattern:** `overmind-{tag}-{os}-{arch}.gz`
  - Example: `overmind-v2.5.1-linux-amd64.gz`
- **Format:** Single gzipped binary (`.gz`, NOT `.tar.gz`)
- **Checksums:** Per-asset `.sha256sum` files containing only the raw 64-char hex hash
  - Example: `overmind-v2.5.1-linux-amd64.gz.sha256sum` → contents: `<64-char-hex>`
- **OS mappings (pixi → asset):**
  - `osx` → `macos`
  - `linux` → `linux` (default)
- **Arch mappings (pixi → asset):**
  - `64` → `amd64`
  - `aarch64` → `arm64`
- **Custom fileName needed:** Yes, because the tag (with `v` prefix) is embedded in the filename:
  `overmind-${version}-${os}-${arch}.gz`

## Build Steps

1. Source is downloaded as `.gz` and extracted by rattler-build to `$SRC_DIR`. The extracted file will be named
   `overmind-v{version}-{os}-{arch}` (`.gz` stripped).
2. Move the extracted binary to `$PREFIX/bin/overmind` using `r.moveGlob("./overmind*", dst)`.
3. On Unix, `chmod 755` the binary.

No compilation needed — these are pre-built Go binaries.

## Test Strategy

- Run `overmind --version` and verify the output contains the expected version.
- Expected output format: `overmind v2.5.1` (or similar). Use `r.coerceSemVer()` to normalize the output for comparison.

## Supported Platforms

| Pixi Platform   | Asset                        |
| --------------- | ---------------------------- |
| `linux-64`      | `overmind-v*-linux-amd64.gz` |
| `linux-aarch64` | `overmind-v*-linux-arm64.gz` |
| `osx-64`        | `overmind-v*-macos-amd64.gz` |
| `osx-arm64`     | `overmind-v*-macos-arm64.gz` |

Note: No Windows builds are provided upstream.

## Runtime Dependencies

- `tmux` from conda-forge (https://prefix.dev/channels/conda-forge/packages/tmux)
  - Added via `requirements: { run: ["tmux"] }`

## Verification Steps

```bash
task generate RECIPE=github.com/DarthSim/overmind
task dryrun RECIPE=github.com/DarthSim/overmind
```

## Reference

See `xcaf/skills/forge-recipe/forge-recipe.xcaf` for general recipe DSL documentation.
