#!/usr/bin/env -S deno run -qA --ext=ts
import { Command } from "@cliffy/command";
import { Confirm } from "@cliffy/prompt";
import { load } from "@std/dotenv";
import { canParse, compare, parse } from "@std/semver";
import { type Platform } from "lib/models/platform.ts";
import { PrefixClient, type VariantDetails } from "lib/prefix_client/mod.ts";

await load({ envPath: `${import.meta.dirname}/../.env`, export: true });

await new Command()
  .name("prefix-clean")
  .description(`
    Deletes old package versions from a prefix.dev channel,
    always keeping the latest version of each package.
  `)
  .option("--channel <channel:string>", "Channel name", { default: "brads-forge" })
  .option("--older-than-days <days:number>", "Delete versions older than this many days.", {
    default: 90,
  })
  .option("--yes", "Skip the confirmation prompt and delete immediately.")
  .option("--dry-run", "Only list what would be deleted; never delete or prompt.")
  .action(async ({ channel, olderThanDays, yes, dryRun }) => {
    const prefix = new PrefixClient();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

    console.log(`Scanning channel "${channel}" for versions older than ${olderThanDays} days...`);

    const packages = await prefix.listPackages({ channel });
    const toDelete: VariantDetails[] = [];

    for (const name of packages) {
      const variants = await prefix.listVariants({ name, channel });
      if (variants.length === 0) continue;

      const groups = groupByVersion(variants);
      const latest = pickLatestVersion(groups);

      for (const [version, group] of groups) {
        if (version === latest) continue;
        // Atomic per-version: if any variant is older than the cutoff, delete
        // the entire version and all of its variants.
        if (group.some((v) => v.createdAt < cutoff)) {
          toDelete.push(...group);
        }
      }
    }

    if (toDelete.length === 0) {
      console.log("Nothing to delete. Channel is within the retention window.");
      return;
    }

    console.log(`\nThe following ${toDelete.length} variant(s) will be deleted:\n`);
    for (const v of toDelete) {
      const age = Math.floor((Date.now() - v.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      console.log(`  ${v.name} ${v.version} [${v.platform}] ${v.filename} (${age}d old, ${formatBytes(v.size)})`);
    }

    const totalBytes = toDelete.reduce((sum, v) => sum + (v.size ?? 0), 0);
    const unknownSizes = toDelete.filter((v) => v.size === null).length;
    console.log(
      `\nEstimated space saved: ${formatBytes(totalBytes)}` +
        (unknownSizes > 0 ? ` (${unknownSizes} variant(s) with unknown size not counted)` : ""),
    );

    if (dryRun) {
      console.log("\n--dry-run: no packages were deleted.");
      return;
    }

    if (!yes) {
      const confirmed = await Confirm.prompt({
        message: `Delete these ${toDelete.length} variant(s)?`,
        default: false,
      });
      if (!confirmed) {
        console.log("Aborted. No packages were deleted.");
        return;
      }
    }

    let deleted = 0;
    const failures: { variant: VariantDetails; error: unknown }[] = [];

    // Deletions run concurrently (each with its own retry loop) so a slow or
    // repeatedly-failing variant doesn't block the deletion of the others.
    await Promise.all(toDelete.map(async (v) => {
      const result = await deleteWithRetry(prefix, channel, v);
      if (result.ok) {
        deleted++;
        console.log(`Deleted ${v.platform}/${v.filename} (${deleted}/${toDelete.length})`);
      } else {
        failures.push({ variant: v, error: result.error });
        console.error(
          `Failed to delete ${v.platform}/${v.filename} after ${MAX_DELETE_ATTEMPTS} attempt(s): ${
            result.error instanceof Error ? result.error.message : result.error
          }`,
        );
      }
    }));

    console.log(`\nDone. Deleted ${deleted} variant(s).`);

    if (failures.length > 0) {
      console.warn(`\nWarning: ${failures.length} variant(s) failed to delete.`);

      const wantsDetails = yes || await Confirm.prompt({
        message: "Would you like to see more details?",
        default: false,
      });

      if (wantsDetails) {
        console.log("\nname,version,platform,filename,error");
        for (const { variant, error } of failures) {
          const message = error instanceof Error ? error.message : String(error);
          console.log(
            [variant.name, variant.version, variant.platform, variant.filename, message]
              .map(csvEscape)
              .join(","),
          );
        }
      }
    }
  })
  .parse(Deno.args);

/** Maximum number of attempts (including the first) made to delete a single variant. */
const MAX_DELETE_ATTEMPTS = 3;

/** Base delay used for exponential backoff between delete retries. */
const RETRY_BASE_DELAY_MS = 500;

/** A function that resolves once it is safe to issue the next rate-limited call. */
type RateLimiter = () => Promise<void>;

/**
 * Creates a rate limiter that spaces out calls so that no more than
 * `perSecond` are allowed to proceed within any given second. Shared across
 * concurrent callers so the overall execution of the script is throttled,
 * not just each individual task.
 */
function createRateLimiter(perSecond: number): RateLimiter {
  const intervalMs = 1000 / perSecond;
  let nextSlot = Date.now();
  return async function acquire(): Promise<void> {
    const now = Date.now();
    // Reserve the next available slot synchronously (before any await) so
    // concurrent callers don't race on `nextSlot`.
    const scheduled = Math.max(now, nextSlot);
    nextSlot = scheduled + intervalMs;
    const wait = scheduled - now;
    if (wait > 0) await delay(wait);
  };
}

/** Limit all delete operations to 5 per second. */
const rateLimiter = createRateLimiter(5);

/**
 * Deletes a single variant, retrying on failure up to `MAX_DELETE_ATTEMPTS`
 * times with exponential backoff. Never throws; the outcome is reported via
 * the returned result so the caller can keep processing other variants.
 */
async function deleteWithRetry(
  prefix: PrefixClient,
  channel: string,
  variant: VariantDetails,
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  for (let attempt = 1; attempt <= MAX_DELETE_ATTEMPTS; attempt++) {
    await rateLimiter();
    try {
      await prefix.deletePackage({
        filename: variant.filename,
        platform: variant.platform as Platform,
        channel,
      });
      return { ok: true };
    } catch (error) {
      if (attempt === MAX_DELETE_ATTEMPTS) {
        return { ok: false, error };
      }
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  // Unreachable, but keeps the type checker happy.
  return { ok: false, error: new Error("unreachable") };
}

/** Resolves after the given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Escapes a value for safe inclusion in a CSV row. */
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Formats a byte count into a human-readable string (e.g. "12.3 MiB"). */
function formatBytes(bytes: number | null): string {
  if (bytes === null) return "unknown size";
  if (bytes === 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${value.toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}

/** Groups variants by their version string. */
function groupByVersion(variants: VariantDetails[]): Map<string, VariantDetails[]> {
  const groups = new Map<string, VariantDetails[]>();
  for (const v of variants) {
    const group = groups.get(v.version) ?? [];
    group.push(v);
    groups.set(v.version, group);
  }
  return groups;
}

/**
 * Picks the latest version from the grouped variants. Prefers semver ordering
 * when every version parses, otherwise falls back to the most recently created.
 */
function pickLatestVersion(groups: Map<string, VariantDetails[]>): string {
  const versions = [...groups.keys()];

  if (versions.every((v) => canParse(v))) {
    return versions.reduce((a, b) => (compare(parse(a), parse(b)) >= 0 ? a : b));
  }

  const newestOf = (version: string) => Math.max(...groups.get(version)!.map((v) => v.createdAt.getTime()));
  return versions.reduce((a, b) => (newestOf(a) >= newestOf(b) ? a : b));
}
