export async function goDefer<T>(
  func: (
    defer: (deferred: () => Promise<void> | void) => void,
    catchDefer: (deferred: () => Promise<void> | void) => void,
  ) => Promise<T>,
): Promise<T> {
  const deferredJobs: {
    deferred: () => Promise<void> | void;
    catch: boolean;
  }[] = [];

  const defer = (deferred: () => Promise<void> | void) =>
    deferredJobs.push({ deferred, catch: false });

  const catchDefer = (deferred: () => Promise<void> | void) =>
    deferredJobs.push({ deferred, catch: true });

  let result: T;
  try {
    result = await func(defer, catchDefer);
  } finally {
    while (deferredJobs.length > 0) {
      const d = deferredJobs.pop();
      if (d) {
        if (d.catch) {
          await d.deferred();
          continue;
        }

        try {
          await d.deferred();
        } catch {
          // swallow exception
        }
      }
    }
  }

  return result;
}

export function goDeferSync<T>(
  func: (defer: (deferred: () => void) => void) => T,
): T {
  const deferredJobs: (() => void)[] = [];
  const defer = (deferred: () => void) => deferredJobs.push(deferred);

  let result;
  try {
    result = func(defer);
  } finally {
    while (deferredJobs.length > 0) {
      deferredJobs.pop()!();
    }
  }

  return result;
}
