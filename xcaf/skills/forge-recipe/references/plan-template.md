# Plan Template

Use this template when writing a `PLAN.md` for a new forge recipe. Copy and fill in all sections. The plan must be
self-contained — assume the reader (which may be a different LLM) has no prior context beyond what's in this document
and the linked skill reference.

---

````markdown
# Recipe Plan: <package-name>

> **Skill reference:** [forge-recipe skill](../../../xcaf/skills/forge-recipe/forge-recipe.xcaf) **DSL reference:**
> [recipe-dsl-reference.md](../../../xcaf/skills/forge-recipe/references/recipe-dsl-reference.md) **Examples:**
> [recipe-examples.md](../../../xcaf/skills/forge-recipe/references/recipe-examples.md)

## Package Summary

| Field       | Value              |
| ----------- | ------------------ |
| Name        | `<package-name>`   |
| Upstream    | `<url>`            |
| Description | <one-line summary> |
| License     | `<SPDX-ID>`        |
| Homepage    | `<url>`            |

## Version Source

- **Method:** <GitHub tags / GitLab tags / custom API / scraping>
- **Tag format:** <e.g. `v1.2.3`, `release-1.2.3`>
- **Filter:** <regex or description of filtering logic, or "none needed">
- **Owner/Repo:** <if GitHub/GitLab>

## Source Assets

- **Release page:** <url>
- **Asset naming pattern:** <e.g. `tool_v{version}_{os}_{arch}.tar.gz`>
- **Archive format:** <.tar.gz / .zip / .gz (single file) / platform-dependent>
- **Checksum strategy:** <per-file .sha256 / checksums.txt / computed from download / GitHub digest>

### OS Mapping

| Pixi OS | Asset string |
| ------- | ------------ |
| `linux` | `<linux>`    |
| `osx`   | `<darwin>`   |
| `win`   | `<windows>`  |

### Arch Mapping

| Pixi Arch           | Asset string |
| ------------------- | ------------ |
| `64`                | `<amd64>`    |
| `arm64` / `aarch64` | `<arm64>`    |

### Supported Platforms

- [ ] linux-64
- [ ] linux-aarch64
- [ ] osx-64
- [ ] osx-arm64
- [ ] win-64
- [ ] win-arm64

## Build Steps

1. <Step 1: e.g. "Extract archive — binary is at `./<name>_v*/<name>`">
2. <Step 2: e.g. "Move binary to `$PREFIX/bin/<name>`">
3. <Step 3: e.g. "chmod 755 on Unix">
4. <Any additional steps: env vars, PATH modifications, symlinks>

> **Note:** If the archive format is plain `.gz` (single gzipped binary, NOT `.tar.gz`), rattler-build does NOT
> auto-extract it. Use `r.archive.gunzipFile()` instead of `r.moveGlob()` in the build function.

## Runtime Dependencies

- <List any tools required at runtime, e.g. `tmux`, `git`>
- <Check availability on conda-forge: https://prefix.dev/channels/conda-forge/packages/<dep>>
- <If none, write "None">

## Test Strategy

- **Command:** `<binary> --version`
- **Expected output format:** <e.g. "`tool 1.2.3`" — extract with split/coerce>
- **Validation:** Compare `r.coerceSemVer(output)` against `pkgVersion`
- **Platform-specific tests:** <any Windows/Unix-specific checks>

## Verification Steps

After writing the recipe to `forge/<path>/recipe.ts`, run:

```bash
# Generate rattler build recipes for all platforms (no build, no upload)
task generate RECIPE=forge/<domain>/<owner>/<repo>/recipe.ts

# Check generated output
ls forge/<domain>/<owner>/<repo>/generated/

# Build and test locally (current platform only, no upload)
task dryrun RECIPE=forge/<domain>/<owner>/<repo>/recipe.ts
```

### Expected outcomes

- `task generate` should complete without errors and produce YAML files in `generated/`
- `task dryrun` should build and pass tests on the current platform
- If either fails, diagnose the error and update the recipe accordingly

## Open Questions

- <List any unresolved questions or assumptions that need user confirmation>

```
```
````
