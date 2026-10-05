import type { Directive } from "vue";
import { fitText } from "@nuri/ui/fit-text";

export { fitText };

type FitEl = HTMLElement & {
  _fit?: ResizeObserver;
  _fitRun?: () => void;
  _fitW?: number;
  _fitT?: string;
};

export const fitName: Directive<FitEl> = {
  mounted(el) {
    const run = () => {
      const width = el.clientWidth;
      const text = el.textContent ?? "";
      if (el._fitW === width && el._fitT === text && el.style.fontSize) return;
      fitText(el);
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
