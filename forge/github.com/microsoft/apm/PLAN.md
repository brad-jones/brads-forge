# Build Plan: microsoft/apm

> Reference: `xcaf/skills/forge-recipe/forge-recipe.xcaf` for general guidance on the recipe DSL and available library
> helpers (`lib/mod.ts`).

## 1. Package Summary

- **Name:** `apm`
- **Upstream:** https://github.com/microsoft/apm
- **Homepage:** https://microsoft.github.io/apm/
- **What it does:** "Agent Package Manager" — a CLI from Microsoft for managing AI agent packages.
- **License:** MIT

## 2. Version Source

Releases use semver tags with a `v` prefix. Resolve the latest release with:

```typescript
version: r.latestGithubTag({ owner: "microsoft", repo: "apm" });
```

## 3. Sources

Upstream publishes PyInstaller `onedir` bundles for Linux, macOS, and Windows. The macOS, Windows, and Linux ARM64
packages continue to use those release assets.

The upstream Linux x86_64 bundle is built with GitHub's Ubuntu 24.04 Python. Its bundled `libpython3.12.so.1.0` imports
symbols versioned `GLIBC_2.38`, so it cannot run on older hosts such as the glibc 2.28 GitHub Copilot VM.

For `linux-64`, replace the release asset with the immutable source archive for the same tag. Its SHA-256 is resolved at
recipe generation time:

```typescript
const sourceArchiveUrl = `https://github.com/${owner}/${repo}/archive/refs/tags/${tag}.tar.gz`;
sources["linux-64"] = [{
  url: sourceArchiveUrl,
  sha256: await r.digestFromUrl(sourceArchiveUrl),
}];
```

## 4. Linux x86_64 Build

Build the upstream PyInstaller bundle from source with conda-forge Python 3.12:

```typescript
requirements: {
  build: ["binutils", "python 3.12.*", "uv"],
  run: ["__glibc >=2.17,<3.0.a0"],
}
```

The build uses upstream's locked dependencies and unmodified PyInstaller specification:

```bash
uv sync --frozen --extra build --python python
./scripts/build-binary.sh
```

This remains a dynamically linked PyInstaller `onedir` bundle. A fully static Python executable is not appropriate here:
Python extension modules and APM's native wheel dependencies still require a libc ABI, and statically linking glibc has
runtime compatibility problems around DNS, NSS, locales, and subprocesses.

Using conda-forge Python changes the bundled CPython runtime's ABI baseline without changing APM's application code. A
local v0.29.0 prototype produced a working bundle whose highest required glibc symbol was `GLIBC_2.17`, compared with
`GLIBC_2.38` in the upstream bundle.

## 5. ABI Guard

After PyInstaller completes, scan every ELF file in the bundle with `readelf --version-info`. Fail the package build if
any file imports a symbol newer than `GLIBC_2.17`.

This guards against a future Python, PyInstaller, or wheel update silently raising the runtime floor while the package
metadata continues to advertise glibc 2.17 compatibility.

## 6. Other Platforms

The upstream archives are installed intact under `$PREFIX/libexec/apm/`. The executable must remain beside its
`_internal/` directory, which contains the bundled CPython runtime and Python dependencies.

On Unix, expose APM through a symlink at `$PREFIX/bin/apm`. On Windows, prepend the real bundle directory to `PATH`
because a hardlink would cause the PyInstaller bootloader to resolve `_internal` relative to the wrong directory.

Linux ARM64 remains on the upstream release artifact and declares `__glibc >=2.38,<3.0.a0`. PyInstaller does not
cross-compile, while this forge currently builds `linux-aarch64` packages on an x86_64 runner. Moving ARM64 to the same
source-build strategy requires a native ARM64 Pixi build environment and is intentionally deferred.

macOS and Windows retain the upstream artifacts and require no glibc constraint.

## 7. Verification

Generate all platform recipes and build the native package:

```bash
task generate RECIPE=forge/github.com/microsoft/apm/recipe.ts
task dryrun RECIPE=forge/github.com/microsoft/apm/recipe.ts
```

Verify that:

- `linux-64` uses the tagged source archive and declares build dependencies plus `__glibc >=2.17,<3.0.a0`.
- `linux-aarch64` uses the upstream bundle and declares `__glibc >=2.38,<3.0.a0`.
- macOS and Windows use upstream release assets without glibc requirements.
- the ABI guard passes for every ELF file in the source-built bundle.
- the installed package returns the expected version from `apm --version`.

The v0.29.0 Linux x86_64 dry-run built `apm-0.29.0-hb687159_1.conda` and passed its clean-environment package test.
