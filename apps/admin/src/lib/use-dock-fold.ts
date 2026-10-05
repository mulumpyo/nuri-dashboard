import { onMounted, onUnmounted, ref } from "vue";

export const dockFoldQuery = "(max-width: 1023px)";
export const dockLandscapeQuery = "(orientation: landscape)";

export const useDockFold = () => {
  const foldable = ref(false);
  const folded = ref(false);
  let widthMedia: MediaQueryList | undefined;
  let landMedia: MediaQueryList | undefined;
  let wasLandscape = false;

  const apply = () => {
    const phone = Boolean(widthMedia?.matches);
    const landscape = Boolean(landMedia?.matches);
    foldable.value = phone;
    if (!phone) {
      folded.value = false;
      wasLandscape = false;
      return;
    }
    if (landscape && !wasLandscape) folded.value = true;
    wasLandscape = landscape;
  };

  const toggle = () => {
    if (!foldable.value) return;
    folded.value = !folded.value;
  };

  onMounted(() => {
    if (typeof window.matchMedia !== "function") return;
    widthMedia = window.matchMedia(dockFoldQuery);
    landMedia = window.matchMedia(dockLandscapeQuery);
    apply();
    widthMedia.addEventListener("change", apply);
    landMedia.addEventListener("change", apply);
  });

  onUnmounted(() => {
    widthMedia?.removeEventListener("change", apply);
    landMedia?.removeEventListener("change", apply);
  });

  return { foldable, folded, toggle };
};
