import { encodeHex } from "https://deno.land/std@0.211.0/encoding/hex.ts#^";
import { digestAlgorithms } from "https://deno.land/std@0.211.0/crypto/_wasm/mod.ts#^";
import { crypto, DigestAlgorithmName } from "https://deno.land/std@0.211.0/crypto/mod.ts#^";
export type { DigestAlgorithmName } from "https://deno.land/std@0.211.0/crypto/mod.ts#^";

/**
 * A compat. layer for <https://github.com/opencontainers/go-digest>
 */
export const OciAlgorithms = Object.fromEntries(
  digestAlgorithms.map((_) => [_.toLowerCase().replace("-", ""), _]),
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
    if (!digestAlgorithms.includes(parts[0] as any)) {
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
   * Calculates a new digest of the given data source.
   */
  static async fromBuffer(b: Buffer, a: DigestAlgorithmName = "SHA-256"): Promise<Digest> {
    return new Digest([a, encodeHex(await crypto.subtle.digest(a, b))]);
  }

  /**
   * Verifies that that given data source matches the digest.
   */
  async verifyBuffer(b: Buffer): Promise<boolean> {
    return this.equals(await Digest.fromBuffer(b, this.algorithm));
  }

  /**
   * Calculates a new digest value from a file.
   */
  static async fromFile(path: string, a: DigestAlgorithmName = "SHA-256"): Promise<Digest> {
    const f = await Deno.open(path, { read: true });
    try {
      return await Digest.fromBuffer(f.readable, a);
    } finally {
      f.close();
    }
  }

  /**
   * Verifies that that given data source matches the digest.
   */
  async verifyFile(path: string): Promise<boolean> {
    return this.equals(await Digest.fromFile(path, this.algorithm));
  }

  /**
   * Calculates a new digest value from a plain old string.
   */
  static async fromString(s: string, a: DigestAlgorithmName = "SHA-256"): Promise<Digest> {
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
