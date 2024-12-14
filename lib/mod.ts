/*
  This module essentially represents the DSL we provide to each recipe.

  eg: import * as r from "lib/mod.ts";
*/

export { Recipe } from "./models/recipe.ts";
export * from "./fs.ts";
export * as path from "@std/path";
export * from "./models/platform.ts";
export { default as http } from "ky";
export {
  Digest,
  digestFromChecksumFile,
  digestFromChecksumTXT,
  digestFromChecksumURL,
  OciAlgorithms,
} from "./digest/mod.ts";
export type { DigestAlgorithmName, DigestPair, Buffer } from "./digest/mod.ts";
export { $ } from "@david/dax";
export * from "./versions/mod.ts";
export * from "./sources/mod.ts";
export * as archive from "./archive/mod.ts";
export * as activation from "./activation/mod.ts";
