<script lang="ts">
import { computed, defineComponent, nextTick, onUnmounted, ref, shallowRef, watch, type Component } from "vue";
import { me } from "../lib/session";
import { isAuth, menuHops, menuTravelMs } from "../router/motion";
import MenuGhost from "./MenuGhost.vue";

type View = Component | null;

export default defineComponent({
  name: "PageTravel",
  components: { MenuGhost },
  props: {
    view: { type: [Object, Function], default: null },
    path: { type: String, required: true },
  },
  setup(props) {
    const stage = ref<HTMLElement | null>(null);
    const shown = shallowRef({ path: props.path, view: props.view as View });
    const dest = shallowRef<{ path: string; view: View } | null>(null);
    const hops = ref<ReturnType<typeof menuHops>>(null);
    const moving = ref(false);
    const ms = ref(0);
    const titleBox = ref({ top: 0, left: 0 });
    let pending: { path: string; view: View } | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const canUsers = () => Boolean(me.value?.canManageUsers);
    const reduced = () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const stop = () => {
      if (timer) clearTimeout(timer);
      timer = undefined;
    };

    const readTitleBox = () => {
      const root = stage.value;
      const title = root?.querySelector<HTMLElement>("#main h1.title");
      if (!root || !title) return;
      const from = root.getBoundingClientRect();
      const box = title.getBoundingClientRect();
      titleBox.value = { top: box.top - from.top, left: box.left - from.left };
    };

    const settle = () => {
      stop();
      if (dest.value) shown.value = dest.value;
      dest.value = null;
      hops.value = null;
      moving.value = false;
      const next = pending;
      pending = null;
      if (next && next.path !== shown.value.path) start(shown.value.path, next.path, next.view);
    };

    const applyShown = (path: string, view: View) => {
      shown.value = { path, view };
      dest.value = null;
      hops.value = null;
      moving.value = false;
    };

    const adoptView = (view: View) => {
      if (dest.value?.path === props.path) {
        dest.value = { path: dest.value.path, view };
        return;
      }
      if (pending?.path === props.path) {
        pending = { path: pending.path, view };
        return;
      }
      if (shown.value.path === props.path) shown.value = { path: shown.value.path, view };
    };

    const start = (from: string, to: string, view: View) => {
      if (isAuth(to) || isAuth(from) || reduced()) {
        applyShown(to, view);
        return;
      }
      const next = menuHops(from, to, canUsers());
      if (!next) {
        applyShown(to, view);
        return;
      }
      dest.value = { path: to, view };
      hops.value = next;
      ms.value = menuTravelMs(next.steps);
      moving.value = false;
      void nextTick(() => {
        readTitleBox();
        requestAnimationFrame(() => {
          readTitleBox();
          moving.value = true;
          stop();
          timer = setTimeout(settle, ms.value + 32);
        });
      });
    };

    watch(
      () => props.path,
      (to, from) => {
        const view = props.view as View;
        if (!from) {
          applyShown(to, view);
          return;
        }
        if (hops.value) {
          pending = { path: to, view };
          return;
        }
        start(from, to, view);
      },
    );

    watch(
      () => props.view,
      (view) => {
        adoptView(view as View);
      },
    );

    onUnmounted(stop);

    const live = computed(() => dest.value ?? shown.value);
    const trackStyle = computed(() =>
      hops.value
        ? {
            "--from": String(hops.value.from),
            "--to": String(hops.value.to),
            "--ms": `${ms.value}ms`,
            "--ghost-title-top": `${titleBox.value.top}px`,
            "--ghost-title-left": `${titleBox.value.left}px`,
          }
        : undefined,
    );

    return { stage, live, hops, moving, trackStyle };
  },
});
</script>

<template>
  <div ref="stage" class="page-stage" :aria-busy="Boolean(hops)">
    <KeepAlive :max="4">
      <component v-if="live.view" :is="live.view" :key="live.path" />
    </KeepAlive>
    <div v-if="hops" class="page-travel" aria-hidden="true">
      <div class="page-travel-track" :class="{ go: moving }" :style="trackStyle">
        <div v-for="item in hops.paths" :key="item" class="page-travel-pane">
          <MenuGhost :path="item" />
        </div>
      </div>
    </div>
  </div>
</template>
