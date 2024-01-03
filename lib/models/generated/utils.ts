// deno-lint-ignore-file
import { tags } from "npm:typia";
export type PathNoBackslash = string & tags.Pattern<"^[^\\\\]+$">;
