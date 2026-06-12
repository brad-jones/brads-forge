# Recipe DSL Reference

This document describes the full API available to `recipe.ts` files via `import * as r from "lib/mod.ts"`.

## Core Class

### `r.Recipe`

The main class that defines a forge package. Every `recipe.ts` file must export a default instance:

```typescript
export default new r.Recipe({ ...props });
```

#### Constructor Props

| Field          | Type                                              | Required | Description                                               |
| -------------- | ------------------------------------------------- | -------- | --------------------------------------------------------- |
| `name`         | `string`                                          | Yes      | Package name (lowercase, hyphens allowed)                 |
| `version`      | `() => Promise<{ raw: string; semver?: string }>` | Yes      | Function returning latest version                         |
| `sources`      | `(tag, semver?) => Sources`                       | Yes      | Function returning download sources                       |
| `about`        | `About`                                           | No       | Package metadata                                          |
| `build`        | `Build`                                           | Yes      | Build configuration                                       |
| `tests`        | `FuncTest \| Test[]`                              | No       | Test configuration                                        |
| `platforms`    | `Platform[]`                                      | No       | Explicit platform list (inferred from sources if omitted) |
| `requirements` | `Requirements`                                    | No       | Package dependencies                                      |
| `extra`        | `Record<string, string>`                          | No       | Arbitrary metadata                                        |

---

## Version Helpers

### `r.latestGithubTag(options)`

Fetches the latest semver-compatible tag from a GitHub repository.

```typescript
r.latestGithubTag({
  owner: string,       // GitHub org or user
  repo: string,        // Repository name
  tagFilter?: RegExp | ((tag: string) => boolean),  // Optional filter
})
```

**Default behavior:** Excludes tags containing `-` (pre-releases), parses remaining as semver, returns highest.

**Returns:** `() => Promise<{ raw: string; semver?: string }>`

---

## Source Helpers

### `r.githubReleaseAssets(options)`

Automatically maps GitHub release assets to platform-specific sources with checksum resolution.

```typescript
r.githubReleaseAssets({
  owner: string,
  repo: string,
  osMap?: Partial<Record<PlatformOs, string>>,      // Map pixi OS names to asset OS names
  archMap?: Partial<Record<PlatformArch, string>>,  // Map pixi arch names to asset arch names
  fileName?: (version: string, os: string, arch: string) => string,  // Exact filename builder
  checksumFilePattern?: RegExp,    // Pattern to find checksum file (default: /checksum|sha256/i)
  checksumFileExt?: string,        // Per-asset checksum file extension (default: ".sha256")
  checksumExtractor?: (txt: string) => string,  // Custom checksum parser
  headers?: Record<string, string>,  // Extra HTTP headers
})
```

**Platform name mappings (pixi → common asset naming):**

| Pixi OS | Common mappings                                |
| ------- | ---------------------------------------------- |
| `linux` | `linux`, `unknown-linux-gnu`, `linux-gnu`      |
| `osx`   | `darwin`, `apple-darwin`, `macos`, `macOS`     |
| `win`   | `windows`, `pc-windows-msvc`, `win32`, `win64` |

| Pixi Arch | Common mappings          |
| --------- | ------------------------ |
| `64`      | `amd64`, `x86_64`, `x64` |
| `arm64`   | `arm64`, `aarch64`       |
| `aarch64` | `aarch64`, `arm64`       |
| `32`      | `386`, `i386`, `x86`     |

**Important platform notes:**

- `linux-arm64` does NOT exist as a pixi platform — use `linux-aarch64`
- `osx-aarch64` does NOT exist — use `osx-arm64`
- `win-aarch64` does NOT exist — use `win-arm64`

**Returns:** `(tag: string) => Promise<Partial<Record<Platform, Source[]>>>`

---

## Filesystem Helpers

### `r.moveGlob(pattern, destination)`

Moves the first file matching a glob pattern to the destination path. Creates parent directories as needed.

```typescript
await r.moveGlob("./<pattern>/**/binary*", destPath);
```

### `r.move(src, dest)`

Moves a file or directory.

### `r.expandGlob(pattern)`

Async iterator over files matching a glob. Re-exported from `@std/fs`.

### `r.ensureDir(path)`, `r.ensureFile(path)`, `r.copy(src, dest)`

Standard filesystem operations from `@std/fs`.

---

## Archive Helpers

### `r.archive.gunzipFile(srcGlob, destination)`

Decompresses a single `.gz` file to the destination path. The `srcGlob` is a glob pattern that resolves to the gzipped
file. Creates parent directories as needed.

**Critical:** Use this for plain `.gz` files (single gzipped binary). rattler-build does NOT auto-extract `.gz` files —
only `.tar.gz`, `.tar.bz2`, `.tar.xz`, and `.zip` are auto-extracted. The `.gz` source is copied as-is to `$SRC_DIR`.

```typescript
// Source lands at: $SRC_DIR/<target_dir>/<filename>.gz (still compressed)
await r.archive.gunzipFile("./tool-name*/*.gz", destPath);
```

### `r.archive.extractZip(zipPath, outputDir)`

Extracts a zip archive to the given directory.

---

## Path Helpers

### `r.path`

Re-export of `@std/path`. Common usage:

```typescript
r.path.join(prefixDir, "bin", exe("mybinary"));
r.path.dirname(filePath);
```

---

## HTTP Client

### `r.http`

A `ky` HTTP client instance. Common usage:

```typescript
// Fetch text (e.g. README)
await r.http.get(url).text();

// Fetch JSON
await r.http.get(url).json();

// Fetch bytes
await (await r.http.get(url)).bytes();
```

---

## Shell Execution

### `r.$`

Template literal tag for running shell commands (from `@david/dax`):

```typescript
const output = await r.$`binary --version`.text();
await r.$`chmod +x ${filePath}`;
```

---

## Version Utilities

### `r.coerceSemVer(versionString)`

Attempts to parse a version string into a normalized semver format. Handles:

- `v1.2.3` → `1.2.3`
- `go1.22.0` → `1.22.0`
- Loose formats via `semver.coerce()`

Returns `string | undefined`.

---

## Activation Helpers

### `r.activation.addEnvVars(vars)`

Sets environment variables that activate when the conda environment is activated:

```typescript
await r.activation.addEnvVars({
  "TOOL_HOME": "$CONDA_PREFIX/tool",
  "TOOL_CACHE": "$CONDA_PREFIX/var/cache/tool",
});
```

### `r.activation.prependToPATH(...paths)`

Prepends paths to PATH on activation:

```typescript
await r.activation.prependToPATH("$CONDA_PREFIX/custom/bin");
```

### `r.activation.addLink(src, dest)`

Creates a symlink (Unix only):

```typescript
await r.activation.addLink(binaryPath, r.path.join(prefixDir, "bin", exe("alias")));
```

---

## Digest Helpers

### `r.Digest.fromBuffer(buffer)`

Computes SHA-256 digest from a byte buffer:

```typescript
const digest = await r.Digest.fromBuffer(await (await r.http.get(url)).bytes());
const hash = digest.hashString;
```

### `r.digestFromChecksumTXT(algorithm, filename, checksumFileContent)`

Extracts a hash for a specific file from a checksums text file.

---

## Build Context (available in `build.func` and `tests.func`)

| Property         | Type               | Description                           |
| ---------------- | ------------------ | ------------------------------------- |
| `prefixDir`      | `string`           | Install prefix (`$PREFIX`)            |
| `recipeDir`      | `string`           | Recipe location (`$RECIPE_DIR`)       |
| `srcDir`         | `string`           | Source extraction dir (`$SRC_DIR`)    |
| `pkgName`        | `string`           | Package name                          |
| `pkgVersion`     | `string`           | Semver version string                 |
| `pkgVersionRaw`  | `string`           | Raw version as from upstream          |
| `targetPlatform` | `Platform`         | e.g. `linux-64`                       |
| `targetOs`       | `PlatformOs`       | e.g. `linux`                          |
| `targetArch`     | `PlatformArch`     | e.g. `64`                             |
| `unix`           | `boolean`          | `true` for linux/osx, `false` for win |
| `exe`            | `(name) => string` | Appends `.exe` on Windows             |
| `buildPlatform`  | `Platform`         | Host platform running the build       |
| `buildOs`        | `PlatformOs`       | Host OS                               |
| `buildArch`      | `PlatformArch`     | Host arch                             |

---

## Supported Platforms

Valid platform strings:

```
linux-64, linux-aarch64, linux-armv6l, linux-armv7l
osx-64, osx-arm64
win-64, win-arm64
```
