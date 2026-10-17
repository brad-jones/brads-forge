import * as r from "lib/mod.ts";
import * as semver from "@std/semver";
import { z } from "zod";
import type { Source } from "lib/models/rattler/source.ts";

const NodeIndex = z.array(
  z.object({
    version: z.string(),
    files: z.array(z.string()),
  }),
);

// Maps our platforms to the identifiers used in index.json's `files` list and the dist archive names.
const platforms: Record<string, { key: string; file: string; ext: string }> = {
  "linux-64": { key: "linux-x64", file: "linux-x64", ext: "tar.xz" },
  "linux-aarch64": { key: "linux-arm64", file: "linux-arm64", ext: "tar.xz" },
  "osx-64": { key: "osx-x64-tar", file: "darwin-x64", ext: "tar.xz" },
  "osx-arm64": { key: "osx-arm64-tar", file: "darwin-arm64", ext: "tar.xz" },
  "win-64": { key: "win-x64-zip", file: "win-x64", ext: "zip" },
  "win-arm64": { key: "win-arm64-zip", file: "win-arm64", ext: "zip" },
};

const distUrl = "https://nodejs.org/dist";

export default new r.Recipe({
  name: "nodejs",
  version: async () => {
    // We only package the "Current" release, which is simply the newest version in the index, whether
    // or not it has been promoted to an LTS line. Entries are already newest first, but sorting makes
    // that independent of the file's ordering.
    const latest = NodeIndex.parse(await r.http.get(`${distUrl}/index.json`).json())
      .map((_) => ({ raw: _.version, semver: r.coerceSemVer(_.version) }))
      .filter((_): _ is { raw: string; semver: string } => _.semver !== undefined)
      .toSorted((a, b) => semver.compare(semver.parse(b.semver), semver.parse(a.semver)))[0];

    if (!latest) throw new Error(`failed to find any versions in ${distUrl}/index.json`);

    return latest;
  },
  sources: async (tag) => {
    const release = NodeIndex.parse(await r.http.get(`${distUrl}/index.json`).json())
      .find((_) => _.version === tag);
    if (!release) throw new Error(`${tag} not found in ${distUrl}/index.json`);

    const checksums = await r.http.get(`${distUrl}/${tag}/SHASUMS256.txt`).text();

    const sources: Partial<Record<r.Platform, z.output<typeof Source>[]>> = {};
    for (const [platform, { key, file, ext }] of Object.entries(platforms)) {
      if (!release.files.includes(key)) continue;
      const fileName = `node-${tag}-${file}.${ext}`;
      sources[platform as r.Platform] = [{
        url: `${distUrl}/${tag}/${fileName}`,
        sha256: r.digestFromChecksumTXT("SHA-256", fileName, checksums).digestPair[1],
        target_directory: "node",
      }];
    }

    return sources;
  },
  about: {
    homepage: "https://nodejs.org/",
    summary: "Node.js is an open-source, cross-platform JavaScript runtime environment.",
    repository: "https://github.com/nodejs/node",
    description: await r.http.get("https://raw.githubusercontent.com/nodejs/node/refs/heads/main/README.md").text(),
    license: "MIT",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false, overlinking_behavior: "ignore" },
    func: async ({ prefixDir }) => {
      // The archives already mirror a conda prefix: bin, lib, include & share on unix, and node.exe,
      // npm.cmd, node_modules & friends at the root on Windows. So we lay them straight over $PREFIX,
      // leaving the upstream docs behind.
      const docs = ["CHANGELOG.md", "LICENSE", "README.md"];
      for await (const entry of Deno.readDir("./node")) {
        if (docs.includes(entry.name)) continue;
        await r.move(r.path.join("./node", entry.name), r.path.join(prefixDir, entry.name));
      }
    },
  },
  tests: {
    func: async ({ pkgVersion, unix }) => {
      if (r.coerceSemVer(await r.$`node --version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }

      // npm is a symlink into lib/node_modules on unix, so make sure the layout survived packaging.
      if (unix && !(await r.$`npm --version`.text()).trim()) {
        throw new Error(`npm did not report a version`);
      }
    },
  },
});
