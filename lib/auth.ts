import { encodeBase64 } from "https://deno.land/std@0.211.0/encoding/base64.ts#^";

export function parseDenoAuthTokens(data = Deno.env.get("DENO_AUTH_TOKENS")) {
  const parsedTokens = [];

  for (const t of data?.split(";") ?? []) {
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

export function getDenoAuthHeaders(address: URL) {
  for (const t of parseDenoAuthTokens()) {
    if (
      t.host === address.hostname &&
      t.port === parseInt(address.port === "" ? "0" : address.port)
    ) {
      return {
        "Authorization": t.bearer
          ? `bearer ${t.bearer}`
          : encodeBase64(`${t.username}:${t.password}`),
      };
    }
  }
}
