import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts#^";

export const allPlatformOs = [
  "emscripten",
  "wasi",
  "linux",
  "osx",
  "win",
  "unknown",
] as const;

export type PlatformOs = typeof allPlatformOs[number];

export const allPlatformArch = [
  "32",
  "64",
  "arm64",
  "aarch64",
  "armv6l",
  "armv7l",
  "ppc64le",
  "ppc64",
  "s390x",
  "riscv32",
  "riscv64",
  "wasm32",
  "unknown",
] as const;

export type PlatformArch = typeof allPlatformArch[number];

export type Platform = `${PlatformOs}-${PlatformArch}`;

export const common64Platforms: Platform[] = [
  "linux-64",
  "osx-64",
  "win-64",
] as const;

export const commonArm64Platforms: Platform[] = [
  "linux-aarch64",
  "osx-arm64",
  "win-arm64",
] as const;

export const commonPlatforms: Platform[] = [
  ...common64Platforms,
  ...commonArm64Platforms,
] as const;

export const currentOs: PlatformOs = (() => {
  switch (Deno.build.os) {
    case "darwin":
      return "osx";
    case "linux":
      return "linux";
    case "windows":
      return "win";
    default:
      return "unknown";
  }
})();

export const currentArch: PlatformArch = (() => {
  switch (Deno.build.arch) {
    case "aarch64":
      return "arm64";
    case "x86_64":
      return "64";
    default:
      return "unknown";
  }
})();

export const currentPlatform: Platform = `${currentOs}-${currentArch}`;

export const splitPlatform = (p: Platform) =>
  p.split("-") as [PlatformOs, PlatformArch];

export const parsePlatform = (v: string) =>
  z.custom<Platform>((val) => {
    if (typeof val !== "string") return false;
    const [os, arch] = val.split("-");
    // deno-lint-ignore no-explicit-any
    return allPlatformOs.includes(os as any) &&
      // deno-lint-ignore no-explicit-any
      allPlatformArch.includes(arch as any);
  }).parse(v);

export const suffixExe = (targetOs: PlatformOs) => (filename: string) =>
  `${filename}${targetOs === "win" ? ".exe" : ""}`;
