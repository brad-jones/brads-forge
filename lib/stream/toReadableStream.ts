// deno-lint-ignore-file no-explicit-any
import { Readable as NodeLikeReadable } from "node:stream";

interface ListenerInterface {
  data: (chunk: any) => void;
  end: (chunk: any) => void;
  close: (err: any) => void;
  error: (err: any) => void;
}

export function toReadableStream(nodeStream: NodeLikeReadable) {
  let destroyed = false;
  const listeners = {} as ListenerInterface;

  function start(controller: any) {
    listeners["data"] = onData;
    listeners["end"] = onData;
    listeners["end"] = onDestroy;
    listeners["close"] = onDestroy;
    listeners["error"] = onDestroy;
    for (const name in listeners) {
      nodeStream.on(name, listeners[name as keyof ListenerInterface]);
    }

    nodeStream.pause();

    function onData(chunk: any) {
      if (destroyed) return;
      controller.enqueue(new Uint8Array(chunk));
      nodeStream.pause();
    }

    function onDestroy(err: any) {
      if (destroyed) return;
      destroyed = true;

      for (const name in listeners) {
        nodeStream.removeListener(
          name,
          listeners[name as keyof ListenerInterface],
        );
      }

      if (err) controller.error(err);
      else controller.close();
    }
  }

  function pull() {
    if (destroyed) return;
    nodeStream.resume();
  }

  function cancel() {
    destroyed = true;

    for (const name in listeners) {
      nodeStream.removeListener(
        name,
        listeners[name as keyof ListenerInterface],
      );
    }

    nodeStream.push(null);
    nodeStream.pause();
    if (nodeStream.destroy) nodeStream.destroy();
  }

  return new ReadableStream({ start: start, pull: pull, cancel: cancel });
}
