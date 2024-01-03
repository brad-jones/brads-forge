import { mapKeys, snake } from "npm:radash@11";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const OptionalUrl = z.string().url().optional();

export const OptionalStringList = z.union([z.string(), z.array(z.string())])
  .optional();

export const PathNoBackslash = z.string().regex(/^[^\\]+$/);

export const toSnakeKeys = (v: Record<string, unknown>) =>
  mapKeys(v, (k) => snake(k));
