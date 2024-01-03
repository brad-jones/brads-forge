import { tags } from "typia";

export type PathNoBackslash = string & tags.Pattern<"^[^\\\\]+$">;
