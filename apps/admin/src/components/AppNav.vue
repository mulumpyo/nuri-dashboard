<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { loadMe, me } from "../lib/session";
import { MENU, menuIndex, menuMatch, menuTravelMs } from "../router/motion";

export default defineComponent({
  name: "AppNav",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const rail = ref<HTMLElement | null>(null);
    const buttons = ref<HTMLButtonElement[]>([]);
    const ready = ref(false);
    const pillOn = ref(false);
    const pillX = ref(0);
    const pillY = ref(0);
    const pillW = ref(0);
    const pillH = ref(0);
    const pillMs = ref(menuTravelMs(1));
    let lastIndex = -1;
    let ro: ResizeObserver | undefined;

    const current = computed(() => route.path);
    const items = computed(() =>
      MENU.filter((item) => !("users" in item && item.users) || me.value?.canManageUsers).filter(
        (item) => !("trail" in item && item.trail),
      ),
    );
    const on = (to: string) => menuMatch(current.value, to);

    const syncPill = () => {
      const index = items.value.findIndex((item) => on(item.to));
      const el = index >= 0 ? buttons.value[index] : undefined;
      const host = rail.value;
      if (!el || !host) {
        pillOn.value = false;
        lastIndex = -1;
        return;
      }
      const steps = lastIndex < 0 ? 1 : Math.abs(index - lastIndex);
      pillMs.value = menuTravelMs(steps);
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

    const measurePill = () => {
      syncPill();
      requestAnimationFrame(() => {
        syncPill();
        requestAnimationFrame(syncPill);
      });
    };

    const watchRail = () => {
      ro?.disconnect();
      if (!rail.value || typeof ResizeObserver === "undefined") return;
      ro = new ResizeObserver(() => syncPill());
      ro.observe(rail.value);
      for (const el of buttons.value) {
        if (el) ro.observe(el);
      }
    };

    const go = (to: string) => {
      if (on(to)) return;
      void router.push(to);
    };

    onMounted(() => {
      if (!me.value) void loadMe();
      void nextTick(() => {
        watchRail();
        measurePill();
      });
    });

    watch([items, current], () => {
      void nextTick(() => {
        watchRail();
        measurePill();
      });
    });

    onUnmounted(() => {
      ro?.disconnect();
    });

    return { me, items, on, go, rail, buttons, ready, pillOn, pillX, pillY, pillW, pillH, pillMs };
  },
});
</script>

<template>
  <header class="app-nav" aria-label="메뉴">
    <div ref="rail" class="row top-menus">
      <span
        class="nav-pill"
        :class="{ on: pillOn, ready }"
        :style="{
          '--nav-pill-x': `${pillX}px`,
          '--nav-pill-y': `${pillY}px`,
          '--nav-pill-w': `${pillW}px`,
          '--nav-pill-h': `${pillH}px`,
          '--nav-pill-ms': `${pillMs}ms`,
        }"
        aria-hidden="true"
      />
      <button
        v-for="item in items"
        :key="item.to"
        ref="buttons"
        class="pressable nav-item"
        :class="{ on: on(item.to) }"
        type="button"
        :aria-current="on(item.to) ? 'page' : undefined"
        @click="go(item.to)"
      >
        {{ item.label }}
      </button>
    </div>
    <button
      class="pressable nav-item"
      :class="{ on: on('/settings') }"
      type="button"
      :aria-current="on('/settings') ? 'page' : undefined"
      @click="go('/settings')"
    >
      설정
    </button>
  </header>
</template>
