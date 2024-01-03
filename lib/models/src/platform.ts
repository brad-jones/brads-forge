export type PlatformOs = "linux" | "darwin" | "windows";

export type PlatformArch = "x64" | "arm64";

export type Platform = `${PlatformOs}-${PlatformArch}`;
