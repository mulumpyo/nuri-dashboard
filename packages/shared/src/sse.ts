/// <reference lib="dom" />
import type { SsePayload } from "./index";

type Options = {
  onOpen?: () => void;
  onError?: () => void;
  retry?: () => boolean;
};

export const connectEvents = (onEvent: (payload: SsePayload) => void, options: Options = {}) => {
  let source: EventSource | null = null;
  let delay = 2000;
  let stopped = false;
  let timer: number | undefined;

  const listen = () => {
    if (stopped) return;
    source?.close();
    source = new EventSource("/api/events");
    source.onopen = () => {
      delay = 2000;
      options.onOpen?.();
    };
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data) as SsePayload;
      if (payload.type === "heartbeat") return;
      onEvent(payload);
    };
    source.onerror = () => {
      options.onError?.();
      source?.close();
      if (stopped || (options.retry && !options.retry())) return;
      void fetch("/api/auth/refresh", { method: "POST", credentials: "include" }).catch(() => undefined);
      timer = window.setTimeout(listen, delay);
      delay = Math.min(delay * 2, 15_000);
    };
  };

  listen();
  return () => {
    stopped = true;
    source?.close();
    if (timer) window.clearTimeout(timer);
  };
};
