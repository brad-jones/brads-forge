# Build Plan: microsoft/apm

> Reference: `xcaf/skills/forge-recipe/forge-recipe.xcaf` for general guidance on the recipe DSL and available library
> helpers (`lib/mod.ts`).

## 1. Package Summary

- **Name:** `apm`
- **Upstream:** https://github.com/microsoft/apm
- **Homepage:** https://microsoft.github.io/apm/
- **What it does:** "Agent Package Manager" — a CLI from Microsoft for managing AI agent packages.
- **License:** MIT (confirmed via GitHub API `license.spdx_id`)

## 2. Version Source

Releases are tagged as plain semver with a `v` prefix (e.g. `v0.28.0`, `v0.27.0`, `v0.26.0` ...). No pre-release/RC tags
observed in the last 15 tags. Use the standard helper with no custom filter:

```typescript
version: r.latestGithubTag({ owner: "microsoft", repo: "apm" });
```

## 3. Source Assets

Latest release (`v0.28.0`) publishes exactly these assets (verified via GitHub API):

```
apm-darwin-arm64.tar.gz        (+ .sha256 sidecar)
apm-darwin-x86_64.tar.gz       (+ .sha256 sidecar)
apm-linux-arm64.tar.gz         (+ .sha256 sidecar)
apm-linux-x86_64.tar.gz        (+ .sha256 sidecar)
apm-windows-x86_64.zip         (+ .sha256 sidecar)
```

Naming pattern: `apm-<os>-<arch>.<ext>` where `<os>` is `darwin`/`linux`/`windows` and `<arch>` is `arm64`/`x86_64`.
This matches the library's default asset-matching logic (substring search per pixi platform), so **no custom `fileName`
function is needed** — just supply `osMap`/`archMap`:

```typescript
sources: r.githubReleaseAssets({
  owner: "microsoft",
  repo: "apm",
  osMap: { "osx": "darwin", "win": "windows" },
  archMap: { "64": "x86_64", "aarch64": "arm64" },
});
```

Notes on arch mapping: the raw pixi arch tokens are `64`, `arm64` (used for `osx-arm64`/`win-arm64`), and `aarch64`
(used for `linux-aarch64`). Asset names always use literal `arm64` regardless of OS, so:

- pixi `aarch64` (linux) → must map to `"arm64"` explicitly (asset name has no `aarch64` substring).
- pixi `arm64` (osx/win) → matches the literal substring `"arm64"` in the asset name by default; no map entry strictly
  required, but harmless/clearer to be consistent.
- pixi `64` → must map to `"x86_64"` (not a bare `"64"`) to avoid accidentally matching the `arm64` asset, since
  `"arm64"` also contains the substring `"64"`.

**Checksums:** GitHub's API returns a `digest` field (`sha256:<hex>`) directly on every release asset already, so
`r.githubReleaseAssets` resolves the sha256 straight from the API metadata — the `.sha256` sidecar files are not needed
and no `checksumExtractor` is required.

## 4. Build Steps

**Important:** the archives are **PyInstaller "onedir" bundles**, not a single static binary. Each archive's top-level
folder (`apm-<os>-<arch>/`) contains:

```
apm-linux-x86_64/
  apm                 <- the executable
  _internal/          <- bundled CPython runtime + all Python deps (required at runtime)
    libpython3.12.so.1.0
    apm_cli/...
    ...
```

(Windows equivalent: `apm.exe` + `_internal/`.)

The executable resolves `_internal` **relative to its own location**, so both must be moved together into the same
destination directory, preserving the `_internal` subdirectory structure intact (do **not** flatten — `_internal`
contains many same-named files across subpackages that would collide if flattened, e.g. via `r.walk` +
flatten-to-single-dir like the `pulumi` recipe does).

**Chosen approach (per user preference):** install the whole bundle intact under `$PREFIX/libexec/apm/` (i.e.
`$PREFIX/libexec/apm/apm` + `$PREFIX/libexec/apm/_internal/`), keeping `$PREFIX/bin/` clean, then expose the command on
`PATH` via `r.activation.addLink()` — a real symlink on Unix, and a real hard link on Windows, both created directly at
build time (see `lib/activation/mod.ts`). This is the same helper already used by e.g.
`forge/github.com/ahmetb/kubectx/recipe.ts` to expose alias commands.

```typescript
build: {
  number: 0,
  dynamic_linking: { binary_relocation: false },
  func: async ({ prefixDir, exe, unix }) => {
    const extractedDir = await r.expandGlobFirst("./apm-*", { breakOnDirOrFile: "dir" });
    if (!extractedDir) throw new Error(`extractedDir undefined`);
    const libexecDir = r.path.join(prefixDir, "libexec", "apm");
    await r.move(extractedDir, libexecDir);
    const bin = r.path.join(libexecDir, exe("apm"));
    if (unix) await Deno.chmod(bin, 0o755);
    await r.activation.addLink(bin, r.path.join(prefixDir, "bin", exe("apm")));
  },
}
```

Notes:

- `r.move(src, dest)` (wrapping `@std/fs.move`, via `lib/fs.ts`) renames the whole extracted directory into place in one
  step — it handles directories recursively, unlike `r.moveGlob`, which only ever moves individual files matched by a
  glob (directory entries are explicitly skipped in its implementation), so it cannot be used to relocate `_internal` as
  a unit.
- `dynamic_linking.binary_relocation: false` is set as usual for prebuilt binaries — important here since the bundle
  ships its own `libpython*.so`.
- `r.activation.addLink` creates the link directly at build time on every platform (a symlink on Unix, a hard link on
  Windows) — this matches the existing `kubectx`/`kubectl-ctx` pattern. A hard link is used on Windows because it does
  not require elevated privileges (unlike a symlink); deferring link creation to an activation script (as previously
  attempted) left `$PREFIX/bin/` empty at packaging time, and rattler-build drops empty directories from the built
  package, so the link never actually got created after install.

## 5. Test Strategy

Running `apm --version` (or `apm.exe --version` on Windows, handled transparently by `r.$`) prints:

```
Agent Package Manager (APM) CLI version 0.28.0 (e041462)
```

Extract the semver token and compare against `pkgVersion`:

```typescript
tests: {
  func: async ({ pkgVersion }) => {
    const output = await r.$`apm --version`.text();
    const version = output.match(/version ([\d.]+)/)?.[1];
    if (!version || r.coerceSemVer(version) !== pkgVersion) {
      throw new Error(`unexpected version returned from binary`);
    }
  },
}
```

## 6. Supported Platforms

Inferred automatically from the source assets (no explicit `platforms` field needed):

- `linux-64`
- `linux-aarch64`
- `osx-64`
- `osx-arm64`
- `win-64`

(No `win-arm64` asset is currently published upstream.)

## 7. Runtime Dependencies

None — the PyInstaller bundle is self-contained (includes its own CPython runtime). No `requirements` field needed.

## 8. Verification Steps

```bash
task generate RECIPE=forge/github.com/microsoft/apm/recipe.ts
task dryrun RECIPE=forge/github.com/microsoft/apm/recipe.ts
```

Check the generated YAML under `forge/github.com/microsoft/apm/generated/` for correctness (per-platform sources,
checksum, build script) before running the dry-run build/test.
