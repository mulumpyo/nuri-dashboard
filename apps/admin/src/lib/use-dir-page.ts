import { nextTick, onActivated, onDeactivated, onMounted, onUnmounted, ref } from "vue";
import { fitListSize } from "./fit-list";
import { usePrompt, useToast } from "./chrome";

export const useDirPage = (row = 46, chrome = 0) => {
  const query = ref("");
  const page = ref(1);
  const pageSize = ref(6);
  const ready = ref(false);
  const viewport = ref<HTMLElement | null>(null);
  const formOpen = ref(false);
  const formBusy = ref(false);
  const { say } = useToast();
  const { ask } = usePrompt();
  let searchTimer: number | undefined;
  let resizeTimer: number | undefined;
  let viewportRo: ResizeObserver | undefined;
  let skipActivate = false;

  const measure = () => {
    const box = viewport.value;
    const well = box?.querySelector<HTMLElement>(".dir-swap");
    const next = fitListSize(well ?? box, row, well ? 0 : chrome);
    if (next === pageSize.value) return false;
    pageSize.value = next;
    return true;
  };

  const search = (run: () => void) => {
    if (searchTimer) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(run, 180);
  };

  const watchViewport = (onResize?: () => void) => {
    const attach = async () => {
      await nextTick();
      measure();
      onResize?.();
      viewportRo?.disconnect();
      viewportRo = new ResizeObserver(() => {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          if (measure()) onResize?.();
        }, 80);
      });
      if (viewport.value) viewportRo.observe(viewport.value);
    };

    onMounted(() => {
      skipActivate = true;
      void attach();
    });
    onActivated(() => {
      if (skipActivate) {
        skipActivate = false;
        return;
      }
      void attach();
    });
    onDeactivated(() => {
      viewportRo?.disconnect();
      viewportRo = undefined;
    });
    onUnmounted(() => {
      viewportRo?.disconnect();
      if (searchTimer) window.clearTimeout(searchTimer);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    });
  };

  return {
    query,
    page,
    pageSize,
    ready,
    viewport,
    formOpen,
    formBusy,
    say,
    ask,
    measure,
    search,
    watchViewport,
  };
};
