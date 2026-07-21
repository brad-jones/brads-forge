import { outdent } from "@cspotcode/outdent";
import * as r from "lib/mod.ts";
import type { Source } from "lib/models/rattler/source.ts";
import { z } from "zod";

export default new r.Recipe({
  name: "ngrok",
  version: async () => {
    // ngrok does not host its CLI binaries on GitHub Releases, nor does it publish
    // any easily parsable list of versions. Instead we use the tags of the official
    // `ngrok/ngrok` Docker Hub image as our version source. Tags look like
    // `3.39.9-debian`, `3.39.9-alpine`, `3.39.9-debian-amd64`, `latest`, `3`, etc.
    // There is no bare `X.Y.Z` tag, so we match the `-debian` suffixed ones.
    //
    // NB: We originally shelled out to `skopeo list-tags docker://ngrok/ngrok` for this, but skopeo
    // has no Windows build (only linux-64/osx-64/osx-arm64 on conda-forge), which breaks recipe
    // generation on Windows GitHub Actions runners. So instead we hit the Docker Hub HTTP API directly
    // - it's cross-platform, requires no extra dependency, and the `name=debian` query param plus
    // `ordering=last_updated` mean the first matching tag on the first page is always the latest.
    const result = await r.http.get(
      "https://registry.hub.docker.com/v2/repositories/ngrok/ngrok/tags",
      { searchParams: { page_size: "100", ordering: "last_updated", name: "debian" } },
    ).json<{ results: { name: string }[] }>();

    const version = result.results
      .map((_) => _.name.match(/^(\d+\.\d+\.\d+)-debian$/)?.[1])
      .find((v): v is string => v !== undefined);

    if (!version) {
      throw new Error("failed to find any ngrok versions in docker.io/ngrok/ngrok tags");
    }

    return { raw: version, semver: r.coerceSemVer(version) };
  },
  sources: async (tag) => {
    // NB: The download page (https://ngrok.com/download/linux?tab=download) tells you to take the
    // `ngrok-v3-stable-linux-amd64.tgz` filename and replace `stable` with a specific version, eg:
    // `ngrok-v3-3.39.9-linux-amd64.tgz`. However, testing has shown that ngrok's CDN completely ignores
    // the version segment of the URL - it always serves whatever the current stable release is, regardless
    // of what you put there (verified: "stable", an old real version, and a bogus version all resolve to
    // byte-for-byte identical downloads). So there is no way to pin/download a historical ngrok version here.
    // We still embed the real version number (rather than the literal string "stable") in case ngrok ever
    // fixes this CDN behavior, and we compute the sha256 fresh at generation time since no checksums are
    // published anywhere for specific versions. The `tests` step below acts as a safety net in case the
    // Docker Hub tag and the CDN's current binary ever drift out of sync with each other.
    //
    // The `bin.ngrok.com/c/<token>` base URL below is not something ngrok documents or publishes - it's
    // only ever rendered client-side by the download page's JS after React hydrates, so it can't be
    // scraped with a plain HTTP GET. We drive a real (headless) browser via obscura + Playwright to load
    // the page and read the rendered download link's `href`, rather than hardcoding a value that ngrok
    // could change/rotate at any time. Passing `?tab=download` makes the "Download" tab active from the
    // initial render, so no click simulation is needed (obscura doesn't do real layout/rendering, so
    // visibility/hit-testing based interactions like clicks aren't reliable there anyway).
    const downloadBaseUrl = await r.withObscuraBrowser(async (page) => {
      await page.goto("https://ngrok.com/download/linux?tab=download", { waitUntil: "domcontentloaded" });
      const href = await page.locator("#download-linux").getAttribute("href");
      if (!href) throw new Error("could not find ngrok download link on https://ngrok.com/download/linux");
      return href.replace(/\/[^/]+$/, "");
    });

    const assets: Record<string, { os: string; arch: string; ext: string }> = {
      "linux-64": { os: "linux", arch: "amd64", ext: "tgz" },
      "linux-aarch64": { os: "linux", arch: "arm64", ext: "tgz" },
      "osx-64": { os: "darwin", arch: "amd64", ext: "zip" },
      "osx-arm64": { os: "darwin", arch: "arm64", ext: "zip" },
      "win-64": { os: "windows", arch: "amd64", ext: "zip" },
      "win-arm64": { os: "windows", arch: "arm64", ext: "zip" },
    };

    const sources: Partial<Record<r.Platform, z.output<typeof Source>[]>> = {};

    for (const [platform, { os, arch, ext }] of Object.entries(assets)) {
      const url = `${downloadBaseUrl}/ngrok-v3-${tag}-${os}-${arch}.${ext}`;
      sources[platform as r.Platform] = [{ url, sha256: await r.digestFromUrl(url) }];
    }

    return sources;
  },
  about: {
    homepage: "https://ngrok.com",
    summary:
      "ngrok is a globally distributed reverse proxy that secures, protects and accelerates your applications and networks",
    description: outdent`
      ngrok is an all-in-one cloud networking platform that secures, transforms, and routes your traffic to services
      running anywhere. It creates a secure tunnel from a public endpoint to a locally running web service, making it
      easy to expose local servers, test webhooks, demo applications, and build APIs without deploying infrastructure.
    `,
    license: "LicenseRef-Proprietary",
  },
  build: {
    number: 0,
    dynamic_linking: { binary_relocation: false },
    func: async ({ prefixDir, exe, unix }) => {
      const dst = r.path.join(prefixDir, "bin", exe("ngrok"));
      await r.moveGlob("./ngrok*", dst);
      if (unix) await Deno.chmod(dst, 0o755);
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if (r.coerceSemVer(await r.$`ngrok version`.text()) !== pkgVersion) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
