import * as semver from "https://deno.land/std@0.211.0/semver/mod.ts#^";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts#^";
import {
  About,
  Build,
  parsePlatform,
  Platform,
  PlatformArch,
  PlatformOs,
  Requirements,
  Source,
  splitPlatform,
  suffixExe,
  Test,
} from "lib/mod.ts";

export interface RecipeProps {
  /**
   * The name of the package.
   */
  name: string;

  /**
   * A human readable description of the package information
   */
  about?: About;

  /**
   * A list of platforms that this recipe supports.
   */
  platforms: Platform[];

  /**
   * A function that returns a sorted (newest to oldest) list of the last 5
   * version numbers from an upstream source. Such as Github Releases or git tags.
   *
   * Any versions that have not yet been published will be in the next GHA run.
   *
   * NB: Why limit this to 5 versions? We do not want to build & package years
   * worth of old versions that could exhaust our GHA build minutes.
   */
  versions: () => Promise<semver.SemVer[]> | semver.SemVer[];

  /**
   * The source items to be downloaded and used for the build.
   */
  sources: (
    version: semver.SemVer,
    targetOs: PlatformOs,
    targetArch: PlatformArch,
  ) => Promise<Source[]> | Source[];

  /**
   * Describes how the package should be build.
   */
  build?: Build;

  /**
   * Tests to run after packaging.
   */
  test?: Test;

  /**
   * The package dependencies.
   */
  requirements?: Requirements;

  /**
   * An set of arbitrary values that are included in the package manifest
   */
  extra?: Record<string, string>;
}

/**
 * Based On: https://raw.githubusercontent.com/prefix-dev/recipe-format/main/schema.json
 * Also see: https://prefix-dev.github.io/rattler-build/recipe_file/#spec-reference
 * Minus the context, conditionals & the "ComplexRecipe".
 */
export class Recipe {
  constructor(public props: RecipeProps) {
    if (Deno.args.length > 0 && Deno.args[0] === "execute") {
      this.#executeCmd();
    }
  }

  #executeCmd = async () =>
    await new Command()
      .name(`recipe-${this.props.name}`)
      .description("Deno rattler recipe runner")
      .option("--build", "If set the build script will be executed.")
      .option("--test", "If set the test script will be executed.")
      .option("--version <version:string>", "The version to build.")
      .option("--platform <platform:string>", "The target platform.")
      .action(async ({ build, test, version, platform }) => {
        const v = semver.parse(version!);
        const targetPlatform = parsePlatform(platform!);
        const [targetOs, targetArch] = splitPlatform(parsePlatform(platform!));

        if (build) {
          await this.props.build?.script!({
            version: v,
            targetOs,
            targetArch,
            targetPlatform,
            prefixDir: Deno.env.get("PREFIX") ?? "",
            suffixExe: suffixExe(targetOs),
          });
          return;
        }

        if (test) {
          await this.props.test?.script!({
            version: v,
            targetOs,
            targetArch,
            targetPlatform,
            suffixExe: suffixExe(targetOs),
          });
          return;
        }
      })
      .parse(Deno.args.slice(1));
}
