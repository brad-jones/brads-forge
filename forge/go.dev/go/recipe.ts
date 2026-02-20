import { outdent } from "@cspotcode/outdent";
import * as r from "lib/mod.ts";
import { z } from "zod";
import type { Source } from "lib/models/rattler/source.ts";

const GoDownloads = z.array(
  z.object({
    version: z.string(),
    files: z.array(
      z.object({
        filename: z.string(),
        os: z.string(),
        arch: z.string(),
        sha256: z.string(),
        kind: z.string(),
      }),
    ),
  }),
);

type GoDownloads = z.infer<typeof GoDownloads>;

let cachedGoDownloads: GoDownloads | undefined = undefined;

async function getGoDownloads(): Promise<GoDownloads> {
  if (!cachedGoDownloads) {
    cachedGoDownloads = GoDownloads.parse(
      await r.http.get("https://go.dev/dl/?mode=json").json(),
    );
  }
  return cachedGoDownloads;
}

export default new r.Recipe({
  name: "go",
  version: async () => {
    const downloads = await getGoDownloads();
    return {
      raw: downloads[0].version,
      semver: r.coerceSemVer(downloads[0].version),
    };
  },
  sources: async (tag) => {
    const sources: Partial<Record<r.Platform, z.output<typeof Source>[]>> = {};

    const mapGOOSToPixi = (GOOS: string) => {
      switch (GOOS) {
        case "windows":
          return "win";
        case "darwin":
          return "osx";
        default:
          return GOOS;
      }
    };

    const mapGOARCHToPixi = (GOOS: string, GOARCH: string) => {
      switch (GOARCH) {
        case "386":
          return "32";
        case "amd64":
          return "64";
        case "arm64":
          if (GOOS === "linux") return "aarch64";
          return "arm64";
        default:
          return GOARCH;
      }
    };

    const archives = (await getGoDownloads()).find((_) =>
      _.version === tag
    )?.files?.filter((_) =>
      _.kind === "archive"
    ) ?? [];

    for (const archive of archives) {
      const platform = r.Platform.safeParse(
        `${mapGOOSToPixi(archive.os)}-${
          mapGOARCHToPixi(archive.os, archive.arch)
        }`,
      );

      if (platform.success) {
        sources[platform.data] = [{
          url: `https://go.dev/dl/${archive.filename}`,
          sha256: archive.sha256,
          target_directory: "go",
        }];
      }
    }

    return sources;
  },
  about: {
    summary: "Build simple, secure, scalable systems with Go",
    homepage: "https://go.dev/",
    repository: "https://github.com/golang/go",
    description: await r.http.get(
      `https://raw.githubusercontent.com/golang/go/refs/heads/master/README.md`,
    ).text(),
    license: "BSD-3-Clause",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, unix }) => {
      const dst = r.path.join(prefixDir, "go");
      await r.move("./go", dst);
      if (unix) {
        for await (const entry of r.expandGlob(r.path.join(dst, "bin/**/*"))) {
          if (entry.isFile) {
            await Deno.chmod(entry.path, 0o755);
          }
        }
      }
      await r.activation.addEnvVars({
        "GOROOT": "$CONDA_PREFIX/go",
        "GOBIN": "$GOROOT/bin",
        "GOMODCACHE": "$CONDA_PREFIX/var/cache/go/pkg/mod",
        "PATH": "$GOBIN:$PATH",
      });
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`go version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
