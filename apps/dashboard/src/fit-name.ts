import type { Directive } from "vue";
import { fitText } from "@nuri/ui/fit-text";

type FitEl = HTMLElement & {
  _fit?: ResizeObserver;
  _fitRun?: () => void;
  _fitW?: number;
  _fitT?: string;
};

const chipCap = (el: HTMLElement) => {
  const parent = el.parentElement;
  if (!parent) return 0;
  const gap = Number.parseFloat(getComputedStyle(parent).gap) || 0;
  const others = [...parent.children].filter((child) => child !== el) as HTMLElement[];
  const used = others.reduce((sum, child) => sum + child.offsetWidth, 0) + gap * others.length;
  return Math.max(0, parent.clientWidth - used);
};

const fitChip = (el: FitEl) => {
  const cap = chipCap(el);
  if (!cap) return 0;
  el.style.maxWidth = `${cap}px`;
  el.style.width = `${cap}px`;
  fitText(el, 11);
  el.style.width = "max-content";
  el.style.overflow = "hidden";
  return cap;
};

export const fitName: Directive<FitEl> = {
  mounted(el) {
    const run = () => {
      const text = el.textContent ?? "";
      if (el.classList.contains("empty")) return;
      if (el.classList.contains("note")) {
        const cap = chipCap(el);
        if (el._fitW === cap && el._fitT === text && el.style.fontSize) return;
        el._fitW = fitChip(el);
        el._fitT = text;
        return;
      }
      const width = el.clientWidth;
      if (el._fitW === width && el._fitT === text && el.style.fontSize) return;
      fitText(el, 12);
      el.style.overflowX = "hidden";
      el.style.overflowY = "visible";
      el._fitW = width;
      el._fitT = text;
    };
    el._fitRun = run;
    const ro = new ResizeObserver(run);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    el._fit = ro;
    requestAnimationFrame(run);
  },
  updated(el) {
    requestAnimationFrame(() => el._fitRun?.());
  },
  unmounted(el) {
    el._fit?.disconnect();
  },
};
