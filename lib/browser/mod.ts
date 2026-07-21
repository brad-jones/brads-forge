import { $ } from "@david/dax";
import { chromium, type Page } from "playwright-core";

/**
 * Spawns a local `obscura` (https://obscura.sh) instance, connects to it with Playwright over
 * the Chrome DevTools Protocol, and hands the resulting `Page` to `fn`. Everything (the
 * Playwright connection and the `obscura` subprocess) is torn down again once `fn` settles, even
 * if it throws.
 *
 * Useful for recipes that need to scrape a value out of a page that is rendered client-side
 * (ie: not present in the server-rendered HTML), where a plain HTTP GET would not suffice.
 *
 * @see https://docs.obscura.sh/quickstart/connect-puppeteer-or-playwright#playwright
 */
export async function withObscuraBrowser<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const port = getAvailablePort();
  const proc = $`obscura serve --port ${port}`.stdout("piped").stderr("piped").noThrow().spawn();

  try {
    const browser = await connectWithRetry(`ws://127.0.0.1:${port}`);

    try {
      const context = browser.contexts()[0] ?? await browser.newContext();
      const page = await context.newPage();

      try {
        return await fn(page);
      } finally {
        await page.close().catch(() => {});
      }
    } finally {
      await browser.close().catch(() => {});
    }
  } finally {
    proc.kill();
    await proc;
  }
}

/**
 * Repeatedly attempts to connect to the given CDP websocket endpoint, giving `obscura` a chance
 * to finish starting up before we give up.
 */
async function connectWithRetry(
  wsEndpoint: string,
  { timeoutMs = 15_000, intervalMs = 100 }: { timeoutMs?: number; intervalMs?: number } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      return await chromium.connectOverCDP(wsEndpoint);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  throw new Error(`obscura did not become ready at ${wsEndpoint} within ${timeoutMs}ms`, { cause: lastError });
}

/** Asks the OS for a free TCP port by briefly binding to port 0. */
function getAvailablePort(): number {
  using listener = Deno.listen({ port: 0, hostname: "127.0.0.1" });
  return (listener.addr as Deno.NetAddr).port;
}
