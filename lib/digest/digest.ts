import { crypto, DIGEST_ALGORITHM_NAMES, DigestAlgorithmName } from "@std/crypto";
import { encodeHex } from "@std/encoding/hex";
import * as fs from "@std/fs";
export { type DigestAlgorithmName } from "@std/crypto";

/**
 * A compat. layer for <https://github.com/opencontainers/go-digest>
 */
export const OciAlgorithms = Object.fromEntries(
  DIGEST_ALGORITHM_NAMES.map((_) => [_.toLowerCase().replace("-", ""), _]),
);

/**
 * An array where the first value represents the digest algorithm
 * & the second value is a string (in hex, not base64) that is the
 * digest value.
 */
export type DigestPair = [DigestAlgorithmName, string];

/**
 * Just an alias for the input that the `crypto.subtle.digest()` function accepts.
 */
export type Buffer = Parameters<typeof crypto.subtle.digest>[1];

/**
 * Inspired by <https://github.com/opencontainers/go-digest>.
 */
export class Digest {
  #v: DigestPair;

  /** Returns the name of the digest algorithm */
  get algorithm(): DigestAlgorithmName {
    return this.#v[0];
  }

  /** Returns the digest hash string (in hex, not base64) */
  get hashString(): string {
    return this.#v[1];
  }

  /** Returns the underlying array */
  get digestPair(): DigestPair {
    return this.#v;
  }

  constructor(v: DigestPair) {
    this.#v = v;
  }

  /**
   * Parses s and returns the validated `Digest` object.
   * An exception will be thrown if the format is invalid.
   */
  static parse(s: string): Digest {
    const parts = s.split(":");
    if (parts.length != 2) {
      throw new Error(`'${s}' is not a valid digest format`);
    }
    // deno-lint-ignore no-explicit-any
    if (!DIGEST_ALGORITHM_NAMES.includes(parts[0] as any)) {
      if (!Object.hasOwn(OciAlgorithms, parts[0])) {
        throw new Error(`'${parts[0]}' is not a valid digest algorithm`);
      }
      parts[0] = OciAlgorithms[parts[0]];
    }
    return new Digest([
      parts[0] as DigestAlgorithmName,
      parts[1].toLowerCase(),
    ]);
  }

  /**
   * Same as `parse` but catches and returns any exception.
   */
  static tryParse(s: string): [true, Digest] | [unknown, undefined] {
    try {
      return [true, Digest.parse(s)];
    } catch (e) {
      return [e, undefined];
    }
  }

  /**
   * Calculates a new digest of the given data.
   */
  static async fromBuffer(
    b: Buffer,
    a: DigestAlgorithmName = "SHA-256",
  ): Promise<Digest> {
    return new Digest([a, encodeHex(await crypto.subtle.digest(a, b))]);
  }

  /**
   * Verifies that the given data matches the digest.
   */
  async verifyBuffer(b: Buffer): Promise<boolean> {
    return this.equals(await Digest.fromBuffer(b, this.algorithm));
  }

  /**
   * Calculates a new digest value from a file.
   */
  static async fromFile(
    path: string,
    a: DigestAlgorithmName = "SHA-256",
  ): Promise<Digest> {
    try {
      const f = await Deno.open(path, { read: true });
      try {
        return await Digest.fromBuffer(f.readable, a);
      } finally {
        try {
          f.close();
        } catch {
          // swallow error, just means someone else has closed this handle
        }
      }
    } catch (e) {
      if (e instanceof Deno.errors.NotFound) {
        return await Digest.fromString("");
      }
      throw e;
    }
  }

  /**
   * Verifies that the given file matches the digest.
   */
  async verifyFile(path: string): Promise<boolean> {
    return this.equals(await Digest.fromFile(path, this.algorithm));
  }

  /**
   * Calculates a new digest from a directory.
   *
   * That is the entire directory will be recursively walked until a digest of
   * each file in the directory has been calculated & then a digest of the
   * digests is returned.
   *
   * Only filenames & contents are considered in the digest calculation.
   * File attributes, like the last modified time or permissions,
   * are completely ignored.
   */
  static async fromDir(
    path: string,
    a: DigestAlgorithmName = "SHA-256",
  ): Promise<Digest> {
    const paths = (await Array.fromAsync(fs.walk(path, { includeDirs: false })))
      .map((_) => _.path).sort();

    const digests: Record<string, string> = {};
    for (const p of paths) {
      digests[p] = (await Digest.fromFile(p, a)).toString();
    }

    return await Digest.fromString(JSON.stringify(digests), a);
  }

  /**
   * Verifies that the given directory matches the digest.
   */
  async verifyDir(path: string): Promise<boolean> {
    return this.equals(await Digest.fromDir(path, this.algorithm));
  }

  /**
   * Calculates a new digest value from a plain old string.
   */
  static async fromString(
    s: string,
    a: DigestAlgorithmName = "SHA-256",
  ): Promise<Digest> {
    return await Digest.fromBuffer(new TextEncoder().encode(s), a);
  }

  /**
   * Verifies that that given string matches the digest.
   */
  async verifyString(s: string): Promise<boolean> {
    return this.equals(await Digest.fromString(s, this.algorithm));
  }

  /**
   * Constructs a string representation of this digest that is
   * compatible with <https://github.com/opencontainers/go-digest>
   */
  toString() {
    return `${this.#v[0].replace("-", "")}:${this.#v[1]}`.toLowerCase();
  }

  /**
   * This allows comparisons like this to work as expected.
   *
   * ```ts
   * Digest.parse("sha256:abc123...") === "sha256:abc123..."
   * ```
   */
  valueOf() {
    return this.toString();
  }

  /**
   * Unfortunately `valueOf()` doesn't work  when comparing two Digest objects
   * as a type case is never called. So this method exists to allow 2 Digest
   * objects to be compared.
   *
   * ```ts
   * Digest.parse("sha256:abc123...").equals(Digest.parse("sha256:abc123..."))
   * ```
   */
  equals(v: Digest) {
    return this.valueOf() === v.valueOf();
  }
}
