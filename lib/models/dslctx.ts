import { Platform, PlatformArch, PlatformOs, suffixExe, splitPlatform, isUnix } from "./platform.ts";
import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";

export interface DslCtx {
  /**
   * The version number of the package that is being built.
   */
  version: semver.SemVer;

  /**
   * An alias of `version` but already formatted as a plain string.
   */
  v: string;

  /**
   * The platform `{os}-{arch}` that is being targeted by the current build.
   */
  targetPlatform: Platform;

  /**
   * Just an alias of `targetPlatform` to allow for a more concise DSL syntax.
   */
  p: Platform;

  /**
   * The operating system that is being targeted by the current build.
   */
  targetOs: PlatformOs;

  /**
   * Just an alias of `targetOs` to allow for a more concise DSL syntax.
   */
  os: PlatformOs;

  /**
   * The architecture that is being targeted by the current build.
   */
  targetArch: PlatformArch;

  /**
   * Just an alias of `targetArch` to allow for a more concise DSL syntax.
   */
  arch: PlatformArch;

  /**
   * A function you can use to automatically suffix a filename with
   * `.exe` based on if the `targetOs` is `win`.
   */
  suffixExe: (filename: string) => string;

  /**
   * Just an alias of `suffixExe` to allow for a more concise DSL syntax.
   */
  exe: (filename: string) => string;

  /**
   * If true then the platform is of a unix nature. eg: Linux or MacOS
   */
  unix: boolean;
}

export const makeDslCtx = (v: semver.SemVer, p: Platform): DslCtx => ({
  version: v,
  v: semver.format(v),
  targetPlatform: p,
  p,
  targetOs: splitPlatform(p)[0],
  os: splitPlatform(p)[0],
  targetArch: splitPlatform(p)[1],
  arch: splitPlatform(p)[1],
  suffixExe: suffixExe(splitPlatform(p)[0]),
  exe: suffixExe(splitPlatform(p)[0]),
  unix: isUnix(p),
});
