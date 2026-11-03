// Newline-delimited JSON streaming for long-running route handlers.

export type ErrorEvent = { type: "error"; message: string };

export type StreamEvent =
  | { type: "status"; message: string }
  | { type: "done"; [key: string]: unknown }
  | { type: "error"; message: string };

/**
 * Runs `work`, streaming each event it sends as one JSON line. A thrown
 * error becomes a final { type: "error" } line, since the 200 status has
 * already been sent.
 */
export function ndjsonResponse<E extends { type: string } = StreamEvent>(
  work: (send: (event: E | ErrorEvent) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: E | ErrorEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        await work(send);
      } catch (err) {
        console.error(err);
        send({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Something went wrong. Try again.",
        });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** Client side: read an NDJSON response, calling onEvent per line. */
export async function readNdjson<E = StreamEvent>(
  response: Response,
  onEvent: (event: E) => void,
): Promise<void> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) onEvent(JSON.parse(line) as E);
      newline = buffer.indexOf("\n");
    }
  }
}
