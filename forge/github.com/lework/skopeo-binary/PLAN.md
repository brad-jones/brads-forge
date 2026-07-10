# Build Plan: skopeo (from skopeo-binary)

## 1. Package Summary

| Field            | Value                                                                                                                                                                                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**         | `skopeo`                                                                                                                                                                                                                                                              |
| **Upstream**     | https://github.com/lework/skopeo-binary                                                                                                                                                                                                                               |
| **What it does** | Pre-built static binaries of [skopeo](https://github.com/podman-container-tools/skopeo) — a command-line utility that performs operations on container images and OCI image repositories (copy, inspect, list-tags, sync, etc.) without requiring a container runtime |
| **License**      | Apache-2.0                                                                                                                                                                                                                                                            |
| **Homepage**     | https://github.com/podman-container-tools/skopeo                                                                                                                                                                                                                      |

> `lework/skopeo-binary` is a build-automation repo that mirrors each official `podman-container-tools/skopeo` release
> as pre-built static binaries for multiple platforms. The release tag and version number always match the upstream
> skopeo release.

---

## 2. Version Source

- **Strategy**: `r.latestGithubTag({ owner: "lework", repo: "skopeo-binary" })`
- **Tag format**: `v<major>.<minor>.<patch>` (e.g., `v1.23.0`)
- **No filtering required** — all release tags are standard semver

---

## 3. Source Assets

### Asset naming pattern

```
skopeo-{os}-{arch}
```

No archive extension — these are bare, statically-linked ELF/Mach-O binaries.

### OS / arch mapping

| Pixi platform   | Asset OS | Asset arch | Full asset name       |
| --------------- | -------- | ---------- | --------------------- |
| `linux-64`      | `linux`  | `amd64`    | `skopeo-linux-amd64`  |
| `linux-aarch64` | `linux`  | `arm64`    | `skopeo-linux-arm64`  |
| `osx-64`        | `darwin` | `amd64`    | `skopeo-darwin-amd64` |
| `osx-arm64`     | `darwin` | `arm64`    | `skopeo-darwin-arm64` |

> **Note:** `linux-ppc64le` assets are published but `ppc64le` is not a supported pixi platform and will be skipped.
>
> **Note:** No Windows assets are published.

### DSL config

```typescript
sources: r.githubReleaseAssets({
  owner,
  repo,
  osMap:   { "osx": "darwin" },
  archMap: { "64": "amd64", "aarch64": "arm64" },
  fileName: (_, os, arch) => `skopeo-${os}-${arch}`,
}),
```

`fileName` is required to prevent the auto-matcher from also selecting `.md5` checksum files (which share the same
OS/arch substrings).

### Checksum strategy

Per-asset `.sha256` files are published (e.g., `skopeo-linux-amd64.sha256`). Content format:

```
<hex-hash>  ./bin/skopeo-linux-amd64
```

The default `checksumFileExt: ".sha256"` + `digestFromChecksumTXT` handles this correctly because the line ends with the
asset name. Additionally, the GitHub API returns an `asset.digest` field for every asset (preferred, zero extra HTTP
calls).

---

## 4. Build Steps

rattler-build places non-archive sources at:

```
$SRC_DIR/<target_directory>/<asset-name>
```

For this recipe `target_directory == asset.name`, so the binary lands at:

```
$SRC_DIR/skopeo-linux-amd64/skopeo-linux-amd64   (linux-64 example)
```

Build function:

```typescript
func: async ({ prefixDir, exe, unix }) => {
  const dst = r.path.join(prefixDir, "bin", exe("skopeo"));
  await r.moveGlob("./skopeo-*/skopeo-*", dst);
  if (unix) await Deno.chmod(dst, 0o755);
},
```

The glob `./skopeo-*/skopeo-*` matches the binary inside the platform-specific directory regardless of which platform is
being built.

---

## 5. Test Strategy

```
$ skopeo --version
skopeo version 1.23.0
```

`r.coerceSemVer()` will coerce `"skopeo version 1.23.0"` → `"1.23.0"` and compare it against `pkgVersion`.

```typescript
tests: {
  func: async ({ pkgVersion }) => {
    if (r.coerceSemVer(await r.$`skopeo --version`.text()) !== pkgVersion) {
      throw new Error(`unexpected version returned from binary`);
    }
  },
},
```

---

## 6. Supported Platforms

| Platform        | Notes               |
| --------------- | ------------------- |
| `linux-64`      | Primary target      |
| `linux-aarch64` | ARM 64-bit Linux    |
| `osx-64`        | macOS Intel         |
| `osx-arm64`     | macOS Apple Silicon |

---

## 7. Verification Steps

After the `recipe.ts` is written, run:

```bash
task generate RECIPE=forge/github.com/lework/skopeo-binary/recipe.ts
```

Inspect the generated YAML in `forge/github.com/lework/skopeo-binary/generated/` to confirm sources, checksums, and
build script look correct.

Then build and test locally:

```bash
task dryrun RECIPE=forge/github.com/lework/skopeo-binary/recipe.ts
```

---

## 8. Reference

General recipe DSL and authoring conventions: `xcaf/skills/forge-recipe/forge-recipe.xcaf`
