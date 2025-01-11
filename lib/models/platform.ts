import { z } from "zod";

export type Platform = `${PlatformOs}-${PlatformArch}`;

export const Platform = z.custom<Platform>((val) => {
  if (typeof val !== "string") return false;
  const [os, arch] = val.split("-");
  // deno-lint-ignore no-explicit-any
  return allOperatingSystems.includes(os as any) &&
    // deno-lint-ignore no-explicit-any
    allArchitectures.includes(arch as any);
});

export const allOperatingSystems = [
  "emscripten",
  "wasi",
  "linux",
  "osx",
  "win",
  "unknown",
] as const;

export type PlatformOs = typeof allOperatingSystems[number];

export const PlatformOs = z.custom<PlatformOs>((val) => {
  if (typeof val !== "string") return false;
  // deno-lint-ignore no-explicit-any
  return allOperatingSystems.includes(val as any);
});

export const allArchitectures = [
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

export type PlatformArch = typeof allArchitectures[number];

export const PlatformArch = z.custom<PlatformArch>((val) => {
  if (typeof val !== "string") return false;
  // deno-lint-ignore no-explicit-any
  return allArchitectures.includes(val as any);
});

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

export const splitPlatform = (p: Platform) => p.split("-") as [PlatformOs, PlatformArch];

export const suffixExe = (targetOs: string) => (filename: string) =>
  `${filename}${targetOs.startsWith("win") ? ".exe" : ""}`;

export function isUnix(v: Platform | PlatformOs) {
  if (v.includes("-")) v = splitPlatform(v as Platform)[0];
  const os = v as PlatformOs;
  return ["linux", "osx"].includes(os);
}

export function invertPlatforms(platforms: Platform[]) {
  return platforms;
}
