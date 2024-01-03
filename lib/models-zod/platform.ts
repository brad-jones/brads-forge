import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const PlatformOs = z.enum(["linux", "darwin", "windows"]);
export type PlatformOs = z.infer<typeof PlatformOs>;

export const PlatformArch = z.enum(["x64", "arm64"]);
export type PlatformArch = z.infer<typeof PlatformArch>;

export const Platform = z.custom<`${PlatformOs}-${PlatformArch}`>((v) => {
  if (typeof v !== "string") {
    return false;
  }

  const [os, arch] = v.split("-");
  if (!Object.values(PlatformOs.Values).includes(os as PlatformOs)) {
    return false;
  }

  if (!Object.values(PlatformArch.Values).includes(arch as PlatformArch)) {
    return false;
  }

  return true;
});

export type Platform = z.infer<typeof Platform>;
