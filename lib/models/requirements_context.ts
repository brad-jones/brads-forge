import { z } from "zod";
import { Platform, PlatformArch, PlatformOs } from "./platform.ts";

/**
 * The generation-time context passed to a `requirements` function.
 *
 * This is intentionally a much smaller subset of fields than `BuildContext`
 * (see `lib/models/build.ts`). `requirements` are resolved when generating
 * `recipe.yaml` (via `task generate`, on the maintainer's/CI machine) — not
 * inside a rattler-build sandbox — so any field that only exists as an
 * environment variable set during an actual build (`prefixDir`, `srcDir`,
 * `cpuCount`, `pkgHash`, `pkgBuildString`, `buildPlatform`/`buildOs`/
 * `buildArch`, etc.) is deliberately omitted rather than populated with
 * empty/misleading defaults.
 */
export const RequirementsContext = z.object({
  /** The platform `{os}-{arch}` these requirements are being resolved for. */
  targetPlatform: Platform,

  /** The operating system that these requirements are being resolved for. */
  targetOs: PlatformOs,

  /** The architecture that these requirements are being resolved for. */
  targetArch: PlatformArch,

  /** True for linux/osx, false for win. */
  unix: z.boolean(),

  /**
   * A function you can use to automatically suffix a filename with
   * `.exe` based on if the `targetOs` is `win`.
   */
  exe: z.custom<(name: string) => string>(),

  /**
   * A parsed semver string, if the upstream version could be parsed.
   * Not all packages follow the convention so this may be undefined.
   */
  pkgVersion: z.string().optional(),

  /**
   * The version string un-altered from the original upstream source.
   */
  pkgVersionRaw: z.string(),

  /**
   * The recipe's `build.noarch`, if it declares one.
   *
   * A noarch recipe produces a single artifact that has to serve every platform it
   * supports, so it cannot carry a dependency that only applies to some of them.
   * `requirements` needs to know that to tell an unresolvable dependency apart from
   * one it can simply resolve for `targetPlatform`.
   */
  noarch: z.enum(["generic", "python"]).optional(),
});
