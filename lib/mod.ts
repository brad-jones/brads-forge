/*
  This module essentially represents the DSL we provide to each recipe.

  eg: import * as r from "lib/mod.ts";
*/

export { $ } from "@david/dax";
export * as path from "@std/path";
export { default as http } from "ky";
export * as activation from "./activation/mod.ts";
export * as archive from "./archive/mod.ts";
export { withObscuraBrowser } from "./browser/mod.ts";
export {
  Digest,
  digestFromChecksumFile,
  digestFromChecksumTXT,
  digestFromChecksumURL,
  digestFromUrl,
  OciAlgorithms,
} from "./digest/mod.ts";
export type { Buffer, DigestAlgorithmName, DigestPair } from "./digest/mod.ts";
export * as downloader from "./downloader/mod.ts";
export * from "./fs.ts";
export * from "./models/platform.ts";
export { Recipe } from "./models/recipe.ts";
export * from "./sources/mod.ts";
export * from "./versions/mod.ts";
