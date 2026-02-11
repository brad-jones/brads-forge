import * as r from "lib/mod.ts";
import { parseHTML } from "linkedom";
import { outdent } from "@cspotcode/outdent";

export default new r.Recipe({
  name: "nircmd",
  platforms: ["win-32", "win-64"],
  version: async () => {
    const html = await r.http.get("https://www.nirsoft.net/utils/nircmd.html").text();

    const { document } = parseHTML(html) as any;
    const rows = document?.querySelectorAll('a[name="verhistory"] ~ table tr:not(:first-child)');
    const result = {
      versions: Array.from(rows ?? []).map((row: any) => ({
        date: row.querySelector("td:nth-child(1)")?.textContent?.trim() || "",
        version: row.querySelector("td:nth-child(2)")?.textContent?.trim() || "",
        description: row.querySelector("td:nth-child(3)")?.textContent?.trim() || "",
      })),
    };

    const raw = result.versions[0].version;
    if (!raw) throw new Error("version not found");

    return { raw, semver: r.coerceSemVer(raw) };
  },
  // NB: No point providing the link to the zip file here as we would need to
  // download the zip file ourselves in order to calculate the sha256 hash of
  // the file. And then rattler-build would download it again which is not ideal.
  // So we will just return an empty array here and then download the source in the build function.
  sources: () => [],
  about: {
    homepage: "https://www.nirsoft.net/utils/nircmd.html",
    summary:
      "NirCmd is a small command-line utility that allows you to do some useful tasks without displaying any user interface.",
    description: outdent`
      By running NirCmd with simple command-line option, you can write and delete values and keys in the Registry,
      write values into INI file, dial to your internet account or connect to a VPN network, restart windows or
      shut down the computer, create shortcut to a file, change the created/modified date of a file, change your display settings,
      turn off your monitor, open the door of your CD-ROM drive, and more...
    `,
    license: "LicenseRef-Freeware",
  },
  build: {
    number: 1,
    dynamic_linking: {
      binary_relocation: false,
    },
    func: async ({ prefixDir, targetArch }) => {
      const url = targetArch === "32"
        ? "https://www.nirsoft.net/utils/nircmd.zip"
        : "https://www.nirsoft.net/utils/nircmd-x64.zip";
      await r.downloader.downloadFile(url, "./nircmd.zip");
      await r.archive.extractZip("./nircmd.zip", "./extracted");
      await r.moveGlob("./extracted/nircmdc.exe", r.path.join(prefixDir, "bin/nircmd.exe"));
    },
  },
  tests: {
    func: async ({ pkgVersion }) => {
      if ((await r.$`nircmd`.text()).includes(pkgVersion)) {
        throw new Error(`unexpected version returned from binary`);
      }
    },
  },
});
