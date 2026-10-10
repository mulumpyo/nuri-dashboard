import { defineComponent } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardResponse, SsePayload } from "@nuri/shared";
import { useDisplay } from "./use-display";

const sse = {
  onPayload: undefined as ((payload: SsePayload) => void) | undefined,
  onOpen: undefined as (() => void) | undefined,
  onError: undefined as (() => void) | undefined,
  stop: vi.fn(),
};

vi.mock("@nuri/shared/sse", () => ({
  connectEvents: (
    onPayload: (payload: SsePayload) => void,
    opts: { onOpen: () => void; onError: () => void },
  ) => {
    sse.onPayload = onPayload;
    sse.onOpen = opts.onOpen;
    sse.onError = opts.onError;
    return sse.stop;
  },
}));

const Host = defineComponent({
  setup() {
    return useDisplay();
  },
  template: "<div />",
});

const board = (from: string): BoardResponse => ({
  from,
  timezone: "Asia/Seoul",
  days: [],
});

const json = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

describe("useDisplay", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/display/");
    sse.onPayload = undefined;
    sse.onOpen = undefined;
    sse.onError = undefined;
    sse.stop.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => json({})),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    window.history.replaceState(null, "", "/display/");
  });

  it("pairs after a board load and reconnects on SSE open", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input).includes("/shipments/board")) return json(board("2026-10-03"));
      return json({});
    });
    const wrap = mount(Host);
    await flushPromises();
    expect(wrap.vm.paired).toBe(true);
    expect(wrap.vm.board?.from).toBe("2026-10-03");
    sse.onOpen?.();
    await flushPromises();
    expect(wrap.vm.live).toBe(true);
    wrap.unmount();
    expect(sse.stop).toHaveBeenCalled();
  });

  it("refreshes a 401 once before falling back to pairing", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/shipments/board")) return json({}, 401);
      if (url.includes("/auth/refresh")) return json({});
      if (url.includes("/devices/code")) return json({ code: "654321" });
      return json({});
    });
    const wrap = mount(Host);
    await flushPromises();
    expect(wrap.vm.paired).toBe(false);
    expect(wrap.vm.code).toBe("654321");
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual(
      expect.arrayContaining(["/api/shipments/board", "/api/auth/refresh", "/api/devices/code"]),
    );
    wrap.unmount();
  });

  it("claims an approved pairing code and listens", async () => {
    vi.useFakeTimers();
    let approved = false;
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/shipments/board")) return approved ? json(board("2026-10-03")) : json({}, 401);
      if (url.includes("/auth/refresh")) return json({}, 401);
      if (url.includes("/devices/claim")) {
        approved = true;
        return json({ deviceId: "3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21" });
      }
      if (url.includes("/auth/me")) return json({ kind: "device", deviceId: "3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21" });
      if (url.includes("/devices/code/") && init?.method !== "POST") {
        return json({ status: "approved" });
      }
      if (url.includes("/devices/code")) return json({ code: "123456" });
      return json({});
    });
    const wrap = mount(Host);
    await flushPromises();
    expect(wrap.vm.digits).toEqual(["1", "2", "3", "4", "5", "6"]);
    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    expect(wrap.vm.paired).toBe(true);
    expect(wrap.vm.tag).toBe("3E21");
    expect(sse.onOpen).toEqual(expect.any(Function));
    wrap.unmount();
  });

  it("slides on a date roll and flashes a changed shipment", async () => {
    vi.useFakeTimers();
    let from = "2026-10-03";
    vi.mocked(fetch).mockImplementation((input) => {
      if (String(input).includes("/shipments/board")) return json(board(from));
      return json({});
    });
    const wrap = mount(Host);
    await flushPromises();
    from = "2026-10-04";
    sse.onPayload?.({ type: "shipment.changed", shipmentId: "s1" });
    await flushPromises();
    expect(wrap.vm.slide).toBe(true);
    expect(wrap.vm.flashes.s1).toBe(true);
    expect(wrap.vm.liveHint).toBe("발송 정보가 바뀌었어요");
    await vi.advanceTimersByTimeAsync(700);
    expect(wrap.vm.slide).toBe(false);
    expect(wrap.vm.flashes.s1).toBeUndefined();
    wrap.unmount();
  });

  it("sends asOf only while the bootstrap admin is previewing", async () => {
    window.history.replaceState(null, "", "/display/?asOf=2026-10-08");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/shipments/board")) return json(board("2026-10-08"));
      if (url.includes("/auth/me")) return json({ kind: "admin", bootstrap: true });
      return json({});
    });
    const wrap = mount(Host);
    await flushPromises();
    expect(wrap.vm.preview).toBe(true);
    expect(wrap.vm.asOf).toBe("2026-10-08");
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual(
      expect.arrayContaining(["/api/shipments/board?asOf=2026-10-08", "/api/auth/me"]),
    );
    wrap.unmount();
  });

  it("applies a date picked in the preview calendar", async () => {
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/shipments/board")) {
        const asOf = url.includes("asOf=") ? url.slice(url.indexOf("asOf=") + 5) : "2026-10-10";
        return json(board(asOf));
      }
      if (url.includes("/auth/me")) return json({ kind: "admin", bootstrap: true });
      return json({});
    });
    const wrap = mount(Host);
    await flushPromises();
    wrap.vm.applyAsOf("2026-10-08");
    await flushPromises();
    expect(wrap.vm.asOf).toBe("2026-10-08");
    expect(window.location.search).toContain("asOf=2026-10-08");
    expect(vi.mocked(fetch).mock.calls.map(([url]) => String(url))).toEqual(
      expect.arrayContaining(["/api/shipments/board?asOf=2026-10-08"]),
    );
    wrap.unmount();
  });

  it("drops asOf when the session is a paired screen", async () => {
    window.history.replaceState(null, "", "/display/?asOf=2026-10-08");
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/shipments/board")) return json(board("2026-10-03"));
      if (url.includes("/auth/me")) return json({ kind: "device", deviceId: "3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21" });
      return json({});
    });
    const wrap = mount(Host);
    await flushPromises();
    expect(wrap.vm.preview).toBe(false);
    expect(wrap.vm.asOf).toBe("");
    expect(window.location.search).not.toContain("asOf");
    wrap.unmount();
  });

  it("copies digits only from the pairing code", () => {
    const wrap = mount(Host);
    wrap.vm.code = "12 34 56";
    const data = { setData: vi.fn() };
    const event = {
      preventDefault: vi.fn(),
      clipboardData: data,
    } as unknown as ClipboardEvent;
    wrap.vm.copyCode(event);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(data.setData).toHaveBeenCalledWith("text/plain", "123456");
    wrap.unmount();
  });
});
