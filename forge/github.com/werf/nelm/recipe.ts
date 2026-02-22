import * as r from "lib/mod.ts";
import { z } from "zod";

const owner = "werf";
const repo = "nelm";

// see: https://tuf.nelm.sh/targets.json
const TargetsFileSchema = z.object({
  signed: z.object({
    targets: z.record(
      z.string(),
      z.object({
        hashes: z.object({
          sha512: z.string(),
        }),
      }),
    ),
  }),
});

function mapOs(os: string) {
  switch (os) {
    case "linux":
      return "linux";
    case "osx":
      return "darwin";
    case "win":
      return "windows";
    default:
      throw new Error(`unsupported os: ${os}`);
  }
}

function mapArch(arch: string) {
  switch (arch) {
    case "64":
      return "amd64";
    case "aarch64":
      return "arm64";
    case "arm64":
      return "arm64";
    default:
      throw new Error(`unsupported arch: ${arch}`);
  }
}

const targets = TargetsFileSchema.parse(
  await r.http.get("https://tuf.nelm.sh/targets.json").json(),
);

export default new r.Recipe({
  name: "nelm",
  version: r.latestGithubTag({
    owner,
    repo,
    tagFilter: (tag) =>
      targets.signed
        .targets[`releases/${tag.replace(/^v/, "")}/linux-amd64/bin/nelm`] !==
        undefined,
  }),
  platforms: ["win-64", "linux-64", "linux-aarch64", "osx-64", "osx-arm64"],
  // NB: There are no sha256 hashes available for the releases but there are sha512
  // hashes but rattler build does not support sha512, so we will download the
  // source in the build function and then calculate the sha256 hash of the file ourselves.
  sources: () => [],
  about: {
    summary:
      "Nelm is a Helm 4 alternative. It is a Kubernetes deployment tool that manages Helm Charts and deploys them to Kubernetes. The Nelm goal is to provide a modern alternative to Helm, with long-standing issues fixed and many new major features introduced.",
    repository: `https://github.com/${owner}/${repo}`,
    description: await r.http.get(
      "https://raw.githubusercontent.com/werf/nelm/refs/heads/main/README.md",
    ).text(),
    license: "Apache-2.0",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async (
      { prefixDir, exe, unix, pkgVersion, targetOs, targetArch },
    ) => {
      const expectedHash = new r.Digest([
        "SHA-512",
        targets.signed
          .targets[
            `releases/${pkgVersion}/${mapOs(targetOs)}-${
              mapArch(targetArch)
            }/bin/${exe("nelm")}`
          ]
          .hashes.sha512,
      ]);

      await r.downloader.downloadFile(
        `https://tuf.nelm.sh/targets/releases/${pkgVersion}/${
          mapOs(targetOs)
        }-${mapArch(targetArch)}/bin/${exe("nelm")}`,
        exe("./nelm"),
      );

      if (!await expectedHash.verifyFile(exe("./nelm"))) {
        throw new Error(`unexpected hash returned from binary`);
      }

      const dst = r.path.join(prefixDir, "bin", exe("nelm"));
      await r.moveGlob(exe("./nelm"), dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`nelm version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
