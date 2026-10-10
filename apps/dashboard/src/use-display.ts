import { computed, onMounted, onUnmounted, ref } from "vue";
import { deviceTag, type BoardResponse, type SsePayload } from "@nuri/shared";
import { connectEvents } from "@nuri/shared/sse";
import { formatBoardDate } from "./format-date";
import { kstStamp, readAsOf, shiftStamp, STAMP, writeAsOf } from "./as-of";

export const useDisplay = () => {
  const board = ref<BoardResponse | null>(null);
  const deviceId = ref("");
  const code = ref("");
  const hint = ref("아래 코드를 어드민에 입력해 주세요");
  const paired = ref(false);
  const preview = ref(false);
  const asOf = ref(readAsOf());
  const live = ref(false);
  const slide = ref(false);
  const flashes = ref<Record<string, boolean>>({});
  const liveHint = ref("");
  let stopEvents: (() => void) | undefined;
  let timer: number | undefined;
  let known = false;

  const tag = computed(() => (deviceId.value ? deviceTag(deviceId.value) : ""));

  const remember = async () => {
    if (known) return;
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) {
      preview.value = false;
      return;
    }
    const body = (await res.json()) as { kind?: string; deviceId?: string; bootstrap?: boolean };
    if (body.deviceId) deviceId.value = body.deviceId;
    preview.value = body.kind === "admin" && Boolean(body.bootstrap);
    if (!preview.value && asOf.value) {
      asOf.value = writeAsOf("");
    }
    known = true;
  };

  const beginPair = async () => {
    known = false;
    preview.value = false;
    paired.value = false;
    live.value = false;
    board.value = null;
    deviceId.value = "";
    stopEvents?.();
    stopEvents = undefined;
    if (timer) window.clearInterval(timer);
    await requestCode();
    timer = window.setInterval(poll, 2000);
  };

  const load = async (retried = false) => {
    const query = asOf.value ? `?asOf=${asOf.value}` : "";
    const res = await fetch(`/api/shipments/board${query}`, { credentials: "include" });
    if (res.status === 401) {
      if (!retried) {
        const refreshed = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
        if (refreshed.ok) return load(true);
      }
      if (paired.value || deviceId.value) {
        await beginPair();
        return;
      }
      paired.value = false;
      live.value = false;
      return;
    }
    const next = (await res.json()) as BoardResponse;
    if (board.value && next.from !== board.value.from) {
      slide.value = true;
      window.setTimeout(() => {
        slide.value = false;
      }, 480);
    }
    board.value = next;
    paired.value = true;
    await remember();
  };

  const listen = () => {
    stopEvents?.();
    stopEvents = connectEvents(
      (payload: SsePayload) => {
        if (payload.type === "device.revoked" && payload.deviceId && payload.deviceId === deviceId.value) {
          void beginPair();
          return;
        }
        if (payload.type === "shipment.changed" && payload.shipmentId) {
          flashes.value = { ...flashes.value, [payload.shipmentId]: true };
          liveHint.value = "발송 정보가 바뀌었어요";
          window.setTimeout(() => {
            const next = { ...flashes.value };
            delete next[payload.shipmentId!];
            flashes.value = next;
          }, 700);
        }
        void load();
      },
      {
        onOpen: () => {
          live.value = true;
          void load();
        },
        onError: () => {
          live.value = false;
        },
        retry: () => paired.value,
      },
    );
  };

  const requestCode = async () => {
    const res = await fetch("/api/devices/code", { method: "POST" });
    const body = (await res.json()) as { code: string };
    code.value = body.code;
  };

  const poll = async () => {
    if (!code.value) return;
    const res = await fetch(`/api/devices/code/${code.value}`);
    if (!res.ok) {
      hint.value = "코드가 만료됐어요. 새 코드를 보여 드릴게요";
      await requestCode();
      return;
    }
    const body = (await res.json()) as { status: string };
    if (body.status === "approved") {
      const claimed = await fetch("/api/devices/claim", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.value }),
      });
      if (claimed.ok) {
        const next = (await claimed.json()) as { deviceId?: string };
        if (next.deviceId) deviceId.value = next.deviceId;
      }
      paired.value = true;
      await load();
      listen();
      if (timer) window.clearInterval(timer);
    }
  };

  onMounted(async () => {
    await load();
    if (paired.value) {
      listen();
      return;
    }
    await requestCode();
    timer = window.setInterval(poll, 2000);
  });

  onUnmounted(() => {
    stopEvents?.();
    if (timer) window.clearInterval(timer);
  });

  const digits = computed(() => code.value.replace(/\D/g, "").slice(0, 6).padEnd(6, " ").split(""));
  const asOfCursor = computed(() => asOf.value || kstStamp());
  const asOfLabel = computed(() => formatBoardDate(asOfCursor.value));

  const applyAsOf = (value: string) => {
    const next = STAMP.test(value) && value !== kstStamp() ? value : "";
    if (next === asOf.value) return;
    asOf.value = writeAsOf(next);
    void load();
  };

  const nudgeAsOf = (days: number) => {
    applyAsOf(shiftStamp(asOfCursor.value, days));
  };

  const onAsOfInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).value;
    applyAsOf(value);
  };

  const clearAsOf = () => {
    applyAsOf("");
  };

  const copyCode = (event: ClipboardEvent) => {
    const picked = (window.getSelection()?.toString() ?? "").replace(/\D/g, "");
    const value = picked || code.value.replace(/\D/g, "");
    if (!value) return;
    event.preventDefault();
    event.clipboardData?.setData("text/plain", value);
  };

  return {
    board,
    code,
    digits,
    hint,
    paired,
    preview,
    asOf,
    asOfCursor,
    asOfLabel,
    nudgeAsOf,
    applyAsOf,
    onAsOfInput,
    clearAsOf,
    live,
    liveHint,
    flashes,
    slide,
    tag,
    copyCode,
  };
};
