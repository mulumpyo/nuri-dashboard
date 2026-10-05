import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import type { BoardCarrier } from "@nuri/shared";

export type DayPane = {
  date: string;
  empty: boolean;
  groups: BoardCarrier[];
};

export const useDayTravel = (
  snap: () => DayPane,
  stepDay: (dir: -1 | 1) => void,
  pickDay: (value: string) => void,
  currentDate: () => string,
) => {
  const stage = ref<HTMLElement | null>(null);
  const shown = ref<DayPane | null>(null);
  const dest = ref<DayPane | null>(null);
  const traveling = ref(false);
  const dayDir = ref<1 | -1>(1);
  let pending = false;
  let stageTimer: ReturnType<typeof setTimeout> | undefined;

  const settleMs = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--settle").trim();
    const ms = Number.parseFloat(raw);
    return Number.isFinite(ms) ? ms : 420;
  };

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fitStage = () => {
    const host = stage.value;
    if (!host) return;
    const panes = Array.from(host.querySelectorAll<HTMLElement>(".day-pane"));
    if (!panes.length) {
      host.style.height = "";
      return;
    }
    host.style.height = `${Math.round(Math.max(...panes.map((el) => el.getBoundingClientRect().height)))}px`;
  };

  const finish = () => {
    if (dest.value) shown.value = dest.value;
    dest.value = null;
    traveling.value = false;
    pending = false;
    window.clearTimeout(stageTimer);
    stageTimer = window.setTimeout(() => {
      if (stage.value) stage.value.style.height = "";
    }, settleMs());
  };

  const go = (dir: -1 | 1, run: () => void) => {
    if (pending || traveling.value) return;
    dayDir.value = dir;
    if (!shown.value || reduced()) {
      run();
      void nextTick(() => {
        shown.value = snap();
      });
      return;
    }
    pending = true;
    shown.value = snap();
    run();
    void nextTick(() => {
      dest.value = snap();
      fitStage();
      requestAnimationFrame(() => {
        traveling.value = true;
        window.clearTimeout(stageTimer);
        stageTimer = window.setTimeout(finish, settleMs() + 32);
      });
    });
  };

  const step = (dir: -1 | 1) => {
    go(dir, () => stepDay(dir));
  };

  const pick = (value: string) => {
    if (value === currentDate()) return;
    go(value > currentDate() ? 1 : -1, () => pickDay(value));
  };

  const dayPanes = computed(() => {
    if (!shown.value) return [];
    if (!dest.value) return [shown.value];
    return dayDir.value > 0 ? [shown.value, dest.value] : [dest.value, shown.value];
  });
  const trackFrom = computed(() => (dest.value && dayDir.value < 0 ? 1 : 0));
  const trackTo = computed(() => (dest.value && dayDir.value > 0 ? 1 : 0));

  const show = (pane: DayPane) => {
    if (pending || traveling.value || dest.value) return;
    shown.value = pane;
  };

  onUnmounted(() => {
    window.clearTimeout(stageTimer);
  });

  return {
    stage,
    shown,
    traveling,
    dayDir,
    dayPanes,
    trackFrom,
    trackTo,
    step,
    pick,
    show,
    snapBusy: () => pending || traveling.value || Boolean(dest.value),
  };
};
