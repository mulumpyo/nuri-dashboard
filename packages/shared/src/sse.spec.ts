import { afterEach, describe, expect, it, vi } from "vitest";
import { connectEvents } from "./sse";

class FakeSource {
  static instances: FakeSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(public url: string) {
    FakeSource.instances.push(this);
    queueMicrotask(() => this.onopen?.());
  }
}

describe("connectEvents", () => {
  afterEach(() => {
    FakeSource.instances = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("forwards shipment events and ignores heartbeat", async () => {
    vi.stubGlobal("EventSource", FakeSource);
    const onEvent = vi.fn();
    const onOpen = vi.fn();
    const stop = connectEvents(onEvent, { onOpen });
    await Promise.resolve();
    const src = FakeSource.instances[0];
    expect(src.url).toBe("/api/events");
    expect(onOpen).toHaveBeenCalled();
    src.onmessage?.({ data: JSON.stringify({ type: "heartbeat" }) });
    src.onmessage?.({ data: JSON.stringify({ type: "shipment.changed", shipmentId: "1" }) });
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: "shipment.changed", shipmentId: "1" });
    stop();
    expect(src.close).toHaveBeenCalled();
  });

  it("refreshes the session and reconnects after an error", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("EventSource", FakeSource);
    const fetchMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", fetchMock);
    const onError = vi.fn();
    const stop = connectEvents(() => undefined, { onError, retry: () => true });
    await Promise.resolve();
    FakeSource.instances[0].onerror?.();
    expect(onError).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/refresh", { method: "POST", credentials: "include" });
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeSource.instances).toHaveLength(2);
    stop();
  });
});
