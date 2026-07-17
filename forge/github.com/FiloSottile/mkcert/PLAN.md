# Build Plan: mkcert

> Reference: [xcaf/skills/forge-recipe/forge-recipe.xcaf](../../../../xcaf/skills/forge-recipe/forge-recipe.xcaf) for
> general guidance on the recipe DSL and available library helpers (`lib/mod.ts`). This plan is self-contained and can
> be executed by any LLM without prior context.

## 1. Package Summary

- **Name:** `mkcert`
- **Upstream:** https://github.com/FiloSottile/mkcert
- **What it does:** A simple zero-config tool for making locally-trusted development TLS certificates. It creates and
  installs a local Certificate Authority (CA) in the system (and optionally Firefox/Java) trust store, then issues
  certificates signed by that CA for arbitrary hostnames, IPs, emails or URLs — avoiding self-signed cert warnings
  during local development.

## 2. Version Source

- Use `r.latestGithubTag({ owner: "FiloSottile", repo: "mkcert" })`.
- Tags are plain semver with a `v` prefix (e.g. `v1.4.4`). No filtering required — the repo has no pre-release tags.
- **Note:** As of writing, the latest (and only recent) release is `v1.4.4`, published 2022-04-26. The project releases
  infrequently; this is expected, not a sign of a stale/broken tag lookup.

## 3. Source Assets

Release assets follow the pattern:

```
mkcert-<tag>-<os>-<arch>[.exe]
```

Examples from the `v1.4.4` release:

- `mkcert-v1.4.4-darwin-amd64`
- `mkcert-v1.4.4-darwin-arm64`
- `mkcert-v1.4.4-linux-amd64`
- `mkcert-v1.4.4-linux-arm` (32-bit ARM — ambiguous variant, not mapped to any pixi platform, safe to ignore)
- `mkcert-v1.4.4-linux-arm64`
- `mkcert-v1.4.4-windows-amd64.exe`
- `mkcert-v1.4.4-windows-arm64.exe`

**Important:** these are raw, uncompressed binaries — NOT archives (no `.tar.gz`/`.zip`) and NOT gzipped (no `.gz`).
rattler-build will not extract anything; the binary lands as-is at `$SRC_DIR/<asset-name>/<asset-name>`. The build step
just needs to `moveGlob` it into place and (on unix) `chmod +x` — no `gunzipFile` or archive extraction needed.

Use `r.githubReleaseAssets` with:

```typescript
osMap: { "osx": "darwin", "win": "windows" }, // linux matches default "linux"
archMap: { "64": "amd64" }, // arm64 matches default "arm64"
```

No `fileName` builder is required — the default asset-name matching (substring search using the maps above) correctly
identifies every asset.

**Checksums:** GitHub's release API returns `"digest": null` for every mkcert asset (no per-asset digest, and no
separate checksum/sha256 file is published in the release). `r.githubReleaseAssets` already handles this automatically —
when no digest and no checksum file are found, it falls back to downloading the asset and computing the SHA-256 itself.
**No custom checksum handling is needed in the recipe.**

## 4. Build Steps

1. Move the downloaded binary to `$PREFIX/bin/mkcert` (`.exe` suffix on Windows via the `exe()` helper):
   ```typescript
   await r.moveGlob("./mkcert-*/mkcert-*", dst);
   ```
   This glob matches both the `target_directory` (which equals the asset file name, e.g. `mkcert-v1.4.4-linux-amd64/`)
   and the file inside it.
2. On unix (`unix === true`), `chmod 0o755` the binary.
3. mkcert optionally shells out to `certutil` (provided by the `nss` package) for installing the CA into NSS-based
   stores (Firefox). It works fine without it (prints a warning and continues), so it's not a hard requirement — but
   since `nss` is available on conda-forge for linux/osx (no win-64/win-arm64 build exists), declare it as a unix-only
   runtime dependency using the new `requirements` function form (`RequirementsContext`):

   ```typescript
   requirements: (ctx) => ({
     run: ctx.unix ? ["nss"] : [],
   }),
   ```

   This resolves once per `targetPlatform` during generation (no `if`/`then` selectors needed in the generated YAML).

## 5. Test Strategy

Run `mkcert -version` (single-dash Go flag, though Go's flag package also accepts `--version`). The binary was built
with `-ldflags
"-X main.Version=$TAG"` by upstream's GitHub Actions release workflow, so it prints the tag (e.g.
`v1.4.4`) — use `r.coerceSemVer()` to normalize and compare against `pkgVersion`.

```typescript
tests: {
  func: async ({ pkgVersion }) => {
    if (r.coerceSemVer(await r.$`mkcert -version`.text()) !== pkgVersion) {
      throw new Error(`unexpected version returned from binary`);
    }
  },
},
```

## 6. Supported Platforms

Inferred automatically from available/matched sources:

- `linux-64`
- `linux-aarch64`
- `osx-64`
- `osx-arm64`
- `win-64`
- `win-arm64`

(`linux-arm` from the release assets is a 32-bit ARM variant that doesn't map cleanly to a pixi arch and is
intentionally left unmapped.)

## 7. Metadata

- **Homepage:** https://github.com/FiloSottile/mkcert
- **Repository:** https://github.com/FiloSottile/mkcert
- **Summary:** "A simple zero-config tool for making locally-trusted development certificates"
- **License:** `BSD-3-Clause` (confirmed via upstream `LICENSE` file)
- **Description:** fetched from `https://raw.githubusercontent.com/FiloSottile/mkcert/refs/heads/master/README.md`

## 8. Verification Steps

```bash
task generate RECIPE=forge/github.com/FiloSottile/mkcert/recipe.ts
task dryrun RECIPE=forge/github.com/FiloSottile/mkcert/recipe.ts
```

Check the generated YAML under `forge/github.com/FiloSottile/mkcert/generated/` for correctness before running the
dry-run build/test.
