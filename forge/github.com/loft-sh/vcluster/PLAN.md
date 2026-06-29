# Forge Recipe Plan: vcluster

> This plan is self-contained. A different LLM may execute it. General recipe authoring conventions live in
> `xcaf/skills/forge-recipe/forge-recipe.xcaf`.

---

## 1. Package Summary

| Field       | Value                                                                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name        | `vcluster`                                                                                                                                                                                          |
| Upstream    | <https://github.com/loft-sh/vcluster>                                                                                                                                                               |
| Homepage    | <https://www.vcluster.com/>                                                                                                                                                                         |
| License     | Apache-2.0                                                                                                                                                                                          |
| Description | Create fully functional virtual Kubernetes tenant clusters — each cluster runs inside a namespace of a host Kubernetes cluster, providing strong isolation with its own API server, CRDs, and RBAC. |

---

## 2. Version Source

- **Tag format:** `v{semver}` — e.g. `v0.35.1`
- **RC/pre-release tags exist:** e.g. `v0.35.1-rc.2` (contain a `-` suffix)
- **Strategy:** Use `r.latestGithubTag({ owner, repo })` with **no custom filter**. The default behaviour of
  `latestGithubTag` already excludes tags that contain `-`, so release-candidate tags are automatically filtered out.

---

## 3. Source Assets

### Asset naming convention (release v0.35.1)

| Platform      | Asset filename               |
| ------------- | ---------------------------- |
| linux-64      | `vcluster-linux-amd64`       |
| linux-aarch64 | `vcluster-linux-arm64`       |
| osx-64        | `vcluster-darwin-amd64`      |
| osx-arm64     | `vcluster-darwin-arm64`      |
| win-64        | `vcluster-windows-amd64.exe` |

Assets are **plain binaries** — there is no archive wrapper (`.tar.gz`, `.zip`, `.gz`). rattler-build will place each
binary in `$SRC_DIR/<asset-name>/<asset-name>`.

### Checksum strategy

A `checksums.txt` file is published alongside the binaries and contains standard `sha256  filename` lines. The default
`checksumFilePattern` (`/checksum|sha256/i`) will match it automatically. No custom extractor is needed.

### `r.githubReleaseAssets` options

```typescript
r.githubReleaseAssets({
  owner,
  repo,
  osMap: { "osx": "darwin", "win": "windows" },
  archMap: { "64": "amd64", "aarch64": "arm64", "arm64": "arm64" },
  fileName: (_, os, arch) => os === "windows" ? `vcluster-${os}-${arch}.exe` : `vcluster-${os}-${arch}`,
});
```

The custom `fileName` is required to avoid false matches against similarly-named assets such as
`vcluster-linux-amd64-standalone` or `vcluster-linux-amd64.sbom`.

---

## 4. Build Steps

Because the sources are **plain binaries** (not archives), rattler-build places each downloaded file at:

```
$SRC_DIR/<asset-name>/<asset-name>
```

e.g. on linux-64: `$SRC_DIR/vcluster-linux-amd64/vcluster-linux-amd64`

Build function:

1. Construct the destination path: `$PREFIX/bin/vcluster` (or `vcluster.exe` on Windows).
2. Use `r.moveGlob("./vcluster-*/vcluster*", dst)` to move the binary.
3. On Unix, `chmod 0o755` the destination binary.

No activation scripts, environment variables, or symlinks are needed.

---

## 5. Test Strategy

Run the binary and confirm it reports the expected version:

```bash
vcluster version
```

Expected output contains the semver string (e.g. `0.35.1`). Parse with a regex and compare against `pkgVersion` after
normalising with `r.coerceSemVer()`.

---

## 6. Supported Platforms

| Pixi Platform   | Asset                        |
| --------------- | ---------------------------- |
| `linux-64`      | `vcluster-linux-amd64`       |
| `linux-aarch64` | `vcluster-linux-arm64`       |
| `osx-64`        | `vcluster-darwin-amd64`      |
| `osx-arm64`     | `vcluster-darwin-arm64`      |
| `win-64`        | `vcluster-windows-amd64.exe` |

No Windows ARM or 32-bit builds are released upstream.

---

## 7. Verification Steps

After the `recipe.ts` file is written, run these commands in order:

```bash
# Generate rattler-build YAML without building
task generate RECIPE=forge/github.com/loft-sh/vcluster/recipe.ts

# Build and test locally (no upload)
task dryrun RECIPE=forge/github.com/loft-sh/vcluster/recipe.ts
```

Check `forge/github.com/loft-sh/vcluster/generated/` for the generated YAML to verify all five platform variants are
present and the asset URLs look correct.
