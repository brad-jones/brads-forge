// deno-lint-ignore-file no-explicit-any
import { Readable } from "node:stream";

export function toNodeReadable(stream: ReadableStream) {
  return new (class extends Readable {
    public bytesRead = 0;
    public released = false;
    private reader: ReadableStreamDefaultReader<any>;
    private pendingRead?: Promise<any>;

    constructor(stream: ReadableStream) {
      super();
      this.reader = stream.getReader();
    }

    public async _read() {
      if (this.released) {
        this.push(null);
        return;
      }
      this.pendingRead = this.reader.read();
      const data = await this.pendingRead;
      delete this.pendingRead;
      if (data.done || this.released) {
        this.push(null);
      } else {
        this.bytesRead += data.value.length;
        this.push(data.value);
      }
    }

    public async waitForReadToComplete() {
      if (this.pendingRead) {
        await this.pendingRead;
      }
    }

    public async close(): Promise<void> {
      await this.syncAndRelease();
    }

    private async syncAndRelease() {
      this.released = true;
      await this.waitForReadToComplete();
      this.reader.releaseLock();
    }
  })(stream);
}
