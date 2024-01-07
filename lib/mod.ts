/*
  This module essentially represents the DSL we provide to each recipe.

  eg: import * as r from "lib/mod.ts";
*/

export * from "./fs/mod.ts";
export * from "./models/platform.ts";
export * from "./version-sources/mod.ts";
export { Recipe } from "./models/recipe.ts";
export type { RecipeProps } from "./models/recipe.ts";
export * as path from "https://deno.land/std@0.211.0/path/mod.ts";
export * as semver from "https://deno.land/std@0.211.0/semver/mod.ts";
export * as shell from "https://deno.land/x/denoexec@v1.1.5/mod.ts";
export {
  Digest,
  digestFromChecksumFile,
  digestFromChecksumTXT,
  digestFromChecksumURL,
  OciAlgorithms,
} from "./digest/mod.ts";
export type { DigestAlgorithmName, DigestPair, Buffer } from "./digest/mod.ts";
