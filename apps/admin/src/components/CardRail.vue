<script lang="ts">
import { defineComponent, nextTick, onMounted, onUnmounted, ref } from "vue";
import { bindDragScroll } from "../lib/drag-scroll";
import Chevron from "./Chevron.vue";

export default defineComponent({
  name: "CardRail",
  components: { Chevron },
  setup() {
    const host = ref<HTMLElement | null>(null);
    const rail = ref<HTMLElement | null>(null);
    const canPrev = ref(false);
    const canNext = ref(false);
    let stopDrag: (() => void) | undefined;
    let ro: ResizeObserver | undefined;

    const lastCardLeft = (el: HTMLElement) => {
      const cards = el.querySelectorAll<HTMLElement>(".company-card");
      const last = cards[cards.length - 1];
      if (!last) return 0;
      const style = getComputedStyle(el);
      const pad =
        Number.parseFloat(style.scrollPaddingInlineStart) || Number.parseFloat(style.paddingInlineStart) || 0;
      return Math.max(0, last.offsetLeft - pad);
    };

    const syncSnap = () => {
      const box = host.value?.getBoundingClientRect();
      if (!box || !rail.value) return;
      rail.value.style.setProperty("--snap-x", `${Math.max(0, Math.round(box.left))}px`);
    };

    const isCarousel = () => window.matchMedia("(max-width: 1023px)").matches;

    const sync = () => {
      const el = rail.value;
      if (!el || !isCarousel()) {
        canPrev.value = false;
        canNext.value = false;
        return;
      }
      syncSnap();
      const end = lastCardLeft(el);
      canPrev.value = el.scrollLeft > 4;
      canNext.value = end > 4 && el.scrollLeft < end - 4;
    };

    const step = (dir: -1 | 1) => {
      const el = rail.value;
      if (!el) return;
      const card = el.querySelector<HTMLElement>(".company-card");
      const gap = Number.parseFloat(getComputedStyle(el).columnGap || getComputedStyle(el).gap) || 12;
      const width = (card?.offsetWidth ?? 160) + gap;
      const end = lastCardLeft(el);
      const next = el.scrollLeft + dir * width;
      canPrev.value = next > 4;
      canNext.value = end > 4 && next < end - 4;
      el.scrollBy({ left: dir * width, behavior: "smooth" });
    };

    onMounted(() => {
      const el = rail.value;
      if (!el) return;
      stopDrag = bindDragScroll(el);
      el.addEventListener("scroll", sync, { passive: true });
      ro = new ResizeObserver(sync);
      ro.observe(el);
      if (host.value) ro.observe(host.value);
      window.addEventListener("resize", sync);
      void nextTick(sync);
    });

    onUnmounted(() => {
      stopDrag?.();
      rail.value?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro?.disconnect();
    });

    return { host, rail, canPrev, canNext, step };
  },
});
</script>

<template>
  <div ref="host" class="card-rail">
    <button v-show="canPrev" class="rail-step prev" type="button" aria-label="이전 카드" @click="step(-1)">
      <Chevron />
    </button>
    <div ref="rail" class="card-grid" :class="{ 'is-scrolled': canPrev }" role="list">
      <slot />
    </div>
    <button v-show="canNext" class="rail-step next" type="button" aria-label="다음 카드" @click="step(1)">
      <Chevron dir="next" />
    </button>
  </div>
</template>
