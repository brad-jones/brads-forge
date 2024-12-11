export interface ArtifactFilter {
  filter(artifacts: URL[]): ArtifactFilterResult | undefined;
}

export interface ArtifactFilterResult {
  src: URL;
  needsExtraction: boolean;
}

const defaultOsMap: Record<typeof Deno.build.os, string> = {
  aix: "aix",
  android: "android",
  darwin: "darwin",
  freebsd: "freebsd",
  illumos: "illumos",
  linux: "linux",
  netbsd: "netbsd",
  solaris: "solaris",
  windows: "windows",
};

const defaultArchMap: Record<typeof Deno.build.arch, string> = {
  aarch64: "aarch64",
  x86_64: "x86_64",
};

export interface DefaultArtifactFilterOptions {
  pattern?: RegExp;
  naked?: boolean;
  os?: typeof Deno.build.os;
  arch?: typeof Deno.build.arch;
  osMap?: Partial<Record<typeof Deno.build.os, string>>;
  archMap?: Partial<Record<typeof Deno.build.arch, string>>;
  patternMap?: Partial<
    Record<`${typeof Deno.build.os}-${typeof Deno.build.arch}`, RegExp>
  >;
}

export class DefaultArtifactFilter implements ArtifactFilter {
  constructor(readonly options?: DefaultArtifactFilterOptions) {}

  filter(artifacts: URL[]): ArtifactFilterResult | undefined {
    const urls = artifacts.map((_) => _.toString());
    const naked = this.options?.naked === true;

    const pattern = this.options?.patternMap
      ? this.options.patternMap[`${Deno.build.os}-${Deno.build.arch}`]
      : this.options?.pattern;

    if (pattern) {
      const match = urls.find((url) => url.match(this.options?.pattern!));
      return match ? { src: new URL(match), needsExtraction: !naked } : undefined;
    }

    const currentOs = this.options?.os ?? Deno.build.os;
    const currentArch = this.options?.arch ?? Deno.build.arch;
    const osMap = this.options?.osMap ?? defaultOsMap;
    const archMap = this.options?.archMap ?? defaultArchMap;
    const os = osMap[currentOs] ?? Deno.build.os;
    const arch = archMap[currentArch] ?? Deno.build.arch;
    const isArchive = (url: string) => url.includes(".zip") || url.includes(".tar");

    for (const url of urls) {
      if (naked) {
        if (isArchive(url)) continue;
        if (url.split("/").at(-1)?.includes(".")) {
          if (currentOs === "windows" && !url.endsWith(".exe")) {
            continue;
          }
        }
      } else {
        if (!isArchive(url)) continue;
      }
      if (!url.includes(arch)) continue;
      if (!url.includes(os)) continue;
      return { src: new URL(url), needsExtraction: !naked };
    }

    return undefined;
  }
}
