import type { XOR } from "npm:ts-xor@^1.3.0";
import { encodeBase64 } from "https://deno.land/std@0.211.0/encoding/base64.ts#^";

/**
 * Represents a token as described by:
 * https://docs.deno.com/runtime/manual/basics/modules/private#deno_auth_tokens
 */
export type DenoAuthToken = XOR<{
  host: string;
  port: number;
  username: string;
  password: string;
}, {
  host: string;
  port: number;
  bearer: string;
}>;

/**
 * Parses the `DENO_AUTH_TOKENS` environment variable into an easy to use object.
 *
 * @param value You may provide your own value to parse otherwise we default
 *              to the environment variable `DENO_AUTH_TOKENS`
 *
 * @returns An array of parsed tokens.
 *
 * @see https://docs.deno.com/runtime/manual/basics/modules/private#deno_auth_tokens
 */
export function parseDenoAuthTokens(value = Deno.env.get("DENO_AUTH_TOKENS")): DenoAuthToken[] {
  const parsedTokens = [];

  for (const t of value?.split(";") ?? []) {
    const parts = t.split("@");

    let host = "", port = 0;
    if (parts[1].includes(":")) {
      const hostParts = parts[1].split(":");
      host = hostParts[0];
      port = parseInt(hostParts[1]);
    } else {
      host = parts[1];
    }

    if (parts[0].includes(":")) {
      const authParts = parts[0].split(":");
      const username = authParts[0];
      const password = authParts[1];
      parsedTokens.push({ host, port, username, password });
    } else {
      const bearer = parts[0];
      parsedTokens.push({ host, port, bearer });
    }
  }

  return parsedTokens;
}

/**
 * Given a url this will see if there is a match in `DENO_AUTH_TOKENS`,
 * if so we provide an object with the key `Authorization` & either
 * a bearer token or base64 encoded username & password.
 *
 * @param url An address to get an Authorization header for.
 * @returns An object that can be used as a fetch headers object.
 */
export function getDenoAuthHeaders(url: string | URL, tokenString?: string) {
  url = typeof url === "string" ? new URL(url) : url;
  for (const t of parseDenoAuthTokens(tokenString)) {
    if (t.host === url.hostname && t.port === parseInt(url.port === "" ? "0" : url.port)) {
      return {
        "Authorization": t.bearer ? `bearer ${t.bearer}` : encodeBase64(`${t.username}:${t.password}`),
      };
    }
  }
}
