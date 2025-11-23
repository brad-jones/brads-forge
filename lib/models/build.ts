// deno-lint-ignore-file no-explicit-any

import { z } from "zod";
import { Platform, PlatformArch, PlatformOs } from "./platform.ts";
import { Build as RattlerBuild } from "./rattler/build.ts";

/**
 * @see https://rattler.build/latest/build_script/#default-environment-variables-set-during-the-build-process
 */
export const BuildContext = z.object({
  /**
   * The build prefix to which the build script should install the software.
   */
  prefixDir: z.string().default(Deno.env.get("PREFIX") ?? ""),

  /**
   * The directory where the recipe is located.
   */
  recipeDir: z.string().default(Deno.env.get("RECIPE_DIR") ?? ""),

  /**
   * The path to where the source code is unpacked or cloned.
   * If the source file is not a recognized archive format,
   * this directory contains a copy of the source file.
   */
  srcDir: z.string().default(Deno.env.get("SRC_DIR") ?? ""),

  /**
   * The name of the package currently under construction.
   */
  pkgName: z.string().default(Deno.env.get("PKG_NAME") ?? ""),

  /**
   * The version of the package currently under construction.
   */
  pkgVersion: z.string().default(Deno.env.get("PKG_VERSION") ?? ""),

  /**
   * The untouched version of the package as returned by the
   * upstream version source without any semver treatmeant.
   */
  pkgVersionRaw: z.string(),

  /**
   * The build number defined in the recipe that is used to version the build.
   */
  pkgBuildNo: z.string().default(Deno.env.get("PKG_BUILDNUM") ?? ""),

  /**
   * Represents the hash of the package being built,
   * excluding the leading 'h' (e.g. 21422ab).
   * This is applicable from conda-build 3.0 onwards.
   */
  pkgHash: z.string().default(Deno.env.get("PKG_HASH") ?? ""),

  /**
   * The complete build string of the package being built,
   * including the hash (e.g. py311h21422ab_0).
   */
  pkgBuildString: z.string().default(Deno.env.get("PKG_BUILD_STRING") ?? ""),

  /**
   * The platform `{os}-{arch}` that is being targeted by the current build.
   */
  targetPlatform: Platform,

  /**
   * The operating system that is being targeted by the current build.
   */
  targetOs: PlatformOs,

  /**
   * The architecture that is being targeted by the current build.
   */
  targetArch: PlatformArch,

  /**
   * If true then the platform is of a unix nature. eg: Linux or MacOS
   */
  unix: z.boolean(),

  /**
   * Represents the number of CPUs on the system.
   */
  cpuCount: z.number().int().default(parseInt(Deno.env.get("CPU_COUNT") ?? "0")),

  /**
   * Denotes the shared library extension specific to the operating system
   * (e.g. .so for Linux, .dylib for macOS, and .dll for Windows).
   */
  shLibExt: z.enum([".so", ".dylib", ".dll"]).default(Deno.env.get("SHLIB_EXT") as any),

  /**
   * A function you can use to automatically suffix a filename with
   * `.exe` based on if the `targetOs` is `win`.
   */
  exe: z.custom<(name: string) => string>(),
});

export const Build = RattlerBuild.extend({
  /**
   * Instead of brittle bash/powershell scripts just write your build using TypeScript.
   */
  func: z.custom<(ctx: z.output<typeof BuildContext>) => Promise<void>>().optional(),
});
