import { nextTick, onMounted, onUnmounted, ref, watch, type Ref } from "vue";
import { pillTravelMs } from "./pill-travel";

export const useSlidingPill = (activeIndex: () => number) => {
  const rail = ref<HTMLElement | null>(null);
  const buttons = ref<HTMLButtonElement[]>([]);
  const ready = ref(false);
  const pillOn = ref(false);
  const pillX = ref(0);
  const pillY = ref(0);
  const pillW = ref(0);
  const pillH = ref(0);
  const pillMs = ref(0);
  let lastIndex = -1;
  let ro: ResizeObserver | undefined;

  const syncPill = (snap: boolean) => {
    const index = activeIndex();
    const el = index >= 0 ? buttons.value[index] : undefined;
    const host = rail.value;
    if (!el || !host) {
      pillOn.value = false;
      lastIndex = -1;
      return;
    }
    pillMs.value = pillTravelMs(snap, lastIndex, index);
    const from = host.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    pillX.value = box.left - from.left + host.scrollLeft;
    pillY.value = box.top - from.top + host.scrollTop;
    pillW.value = box.width;
    pillH.value = box.height;
    pillOn.value = true;
    lastIndex = index;
    requestAnimationFrame(() => {
      ready.value = true;
    });
  };

  const snapPill = () => syncPill(true);
  const movePill = () => syncPill(false);

  const onScroll = () => snapPill();

  const watchRail = () => {
    ro?.disconnect();
    rail.value?.removeEventListener("scroll", onScroll);
    if (!rail.value || typeof ResizeObserver === "undefined") return;
    ro = new ResizeObserver(() => snapPill());
    ro.observe(rail.value);
    rail.value.addEventListener("scroll", onScroll, { passive: true });
  };

  const bindRail = () => {
    void nextTick(() => {
      watchRail();
      snapPill();
      requestAnimationFrame(snapPill);
    });
  };

  onMounted(bindRail);
  watch(activeIndex, () => {
    void nextTick(movePill);
  });
  watch(() => buttons.value.length, bindRail);
  onUnmounted(() => {
    ro?.disconnect();
    rail.value?.removeEventListener("scroll", onScroll);
  });

  const pillStyle = (): Record<string, string> => ({
    "--nav-pill-x": `${pillX.value}px`,
    "--nav-pill-y": `${pillY.value}px`,
    "--nav-pill-w": `${pillW.value}px`,
    "--nav-pill-h": `${pillH.value}px`,
    "--nav-pill-ms": `${pillMs.value}ms`,
  });

  return { rail, buttons, ready, pillOn, pillStyle };
};

export type SlidingPill = {
  rail: Ref<HTMLElement | null>;
  buttons: Ref<HTMLButtonElement[]>;
  ready: Ref<boolean>;
  pillOn: Ref<boolean>;
  pillStyle: () => Record<string, string>;
};
