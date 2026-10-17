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
  // The conda cacert bundle (SSL_CERT_FILE/SSL_CERT_DIR) makes obscura panic with
  // `InvalidCertificate(BadEncoding)` when building its HTTP client, so it must use its own roots.
  const proc = $`obscura serve --port ${port}`
    .env({ SSL_CERT_FILE: "", SSL_CERT_DIR: "" })
    .stdout("piped").stderr("piped").noThrow().spawn();

  try {
    const browser = await connectWithRetry(`ws://127.0.0.1:${port}`);

    try {
      const context = browser.contexts()[0] ?? await browser.newContext();
      const page = await context.newPage();

      try {
        return await fn(page);
      } finally {
        await withTimeout(page.close(), 5_000);
      }
    } finally {
      await withTimeout(browser.close(), 5_000);
    }
  } finally {
    // Never block on teardown: on Windows the process (or its pipes) can outlive a graceful kill.
    proc.kill("SIGKILL");
    await withTimeout(proc, 5_000);
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
      return await chromium.connectOverCDP(wsEndpoint, { timeout: 5_000 });
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

/** Waits for promise but gives up (and swallows errors) after ms, so teardown can never hang. */
async function withTimeout(promise: PromiseLike<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      Promise.resolve(promise).catch(() => {}),
      new Promise<void>((resolve) => timer = setTimeout(resolve, ms)),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
