<script lang="ts">
import { defineComponent, onUnmounted, ref, watch, type PropType } from "vue";
import { carrierNeedsTime, PAY_TYPE_LABEL, PAY_TYPES } from "@nuri/shared";
import CompanyPicker from "./CompanyPicker.vue";
import SegControl from "./SegControl.vue";
import Skeleton from "./Skeleton.vue";
import TimePicker from "./TimePicker.vue";
import { overlay } from "../lib/chrome";
import { useDockFold } from "../lib/use-dock-fold";
import { useSlidingPill } from "../lib/use-sliding-pill";
import type { useHomeBoard } from "../lib/use-home-board";

type Board = ReturnType<typeof useHomeBoard>;

export default defineComponent({
  name: "HomeDock",
  components: { CompanyPicker, SegControl, Skeleton, TimePicker },
  props: {
    board: { type: Object as PropType<Board>, required: true },
  },
  setup(props) {
    const { foldable, folded, toggle } = useDockFold();
    const dock = ref<HTMLElement | null>(null);
    let dockRo: ResizeObserver | undefined;
    const carrierIndex = () => props.board.carriers.value.findIndex((item) => item.id === props.board.carrierId.value);
    const carrierPill = useSlidingPill(carrierIndex);

    const syncDock = () => {
      const el = dock.value;
      const host = el?.closest<HTMLElement>(".wrap");
      if (!el || !host) return;
      const height = Math.round(el.getBoundingClientRect().height);
      const prev = Number.parseFloat(host.style.getPropertyValue("--dock-h")) || 0;
      host.style.setProperty("--dock-h", `${height}px`);
      if (prev <= 0 || height <= prev) return;
      const listBottom = host.querySelector(".list")?.getBoundingClientRect().bottom ?? 0;
      const overlap = listBottom - el.getBoundingClientRect().top + 12;
      if (overlap <= 0) return;
      window.scrollBy({
        top: Math.min(height - prev, overlap),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    };

    watch(
      () => props.board.pickerOpen.value,
      (on) => {
        overlay.picker = on;
      },
    );

    watch(dock, (el) => {
      dockRo?.disconnect();
      if (!el) return;
      dockRo = new ResizeObserver(syncDock);
      dockRo.observe(el);
      syncDock();
    });

    onUnmounted(() => {
      dockRo?.disconnect();
      dock.value?.closest<HTMLElement>(".wrap")?.style.removeProperty("--dock-h");
      overlay.picker = false;
    });

    const onNoteEnter = (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return;
      void props.board.save();
    };

    return {
      ...props.board,
      foldable,
      folded,
      toggle,
      dock,
      onNoteEnter,
      carrierRail: carrierPill.rail,
      carrierButtons: carrierPill.buttons,
      carrierPillOn: carrierPill.pillOn,
      carrierPillReady: carrierPill.ready,
      carrierPillStyle: carrierPill.pillStyle,
      payOptions: PAY_TYPES.map((id) => ({ id, label: PAY_TYPE_LABEL[id] })),
      carrierNeedsTime,
    };
  },
});
</script>

<template>
  <aside ref="dock" class="dock" :class="{ folded: foldable && folded }" aria-label="발송 추가">
    <button
      v-if="foldable"
      class="dock-toggle"
      type="button"
      :aria-expanded="!folded"
      aria-controls="dock-fields"
      @click="toggle"
    >
      <span class="dock-label" :class="folded ? 'dock-name' : 'caption'">
        {{ folded ? "발송 등록" : board ? composeLabel : "불러오는 중" }}
      </span>
      <span>{{ folded ? "펼치기" : "접기" }}</span>
    </button>
    <p v-else class="caption dock-label">{{ board ? composeLabel : "불러오는 중" }}</p>
    <Skeleton v-if="!board && !(foldable && folded)" variant="pills" :rows="3" />
    <template v-else-if="!foldable || !folded">
      <div id="dock-fields" class="dock-fields">
      <div class="dock-search">
        <button
          id="company-search"
          class="search-field pick-field"
          :class="{ muted: !company }"
          type="button"
          :aria-label="company ? company.name : '업체 선택'"
          :aria-expanded="pickerOpen"
          aria-haspopup="dialog"
          @click="pickerOpen = true"
        >
          <svg class="search-ico" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="8.6" cy="8.6" r="5.2" fill="none" stroke="currentColor" stroke-width="1.7" />
            <path d="M12.5 12.5 16.4 16.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
          </svg>
          <span>{{ company ? company.name : "업체 선택" }}</span>
        </button>
      </div>
      <div ref="carrierRail" class="pills chips" role="group" aria-label="택배사 선택">
        <span
          class="nav-pill chip-pill"
          :class="{ on: carrierPillOn, ready: carrierPillReady }"
          :style="carrierPillStyle()"
          aria-hidden="true"
        />
        <button
          v-for="item in carriers"
          :key="item.id"
          ref="carrierButtons"
          class="chip pressable"
          :class="{ on: carrierId === item.id }"
          type="button"
          :aria-pressed="carrierId === item.id"
          @click="carrierId = item.id"
        >
          {{ item.name }}
        </button>
      </div>
      <SegControl
        class="item-pay"
        :model-value="payType"
        :options="payOptions"
        label="결제 구분"
        @update:model-value="payType = $event"
      />
      <div v-if="needsTime" class="pills chips time-row">
        <TimePicker v-model="shipTime" />
      </div>
      <label class="search-field dock-note">
        <input
          v-model="note"
          class="field"
          type="text"
          maxlength="40"
          placeholder="메모"
          aria-label="메모"
          autocomplete="off"
          @keydown.enter.prevent="onNoteEnter"
        />
      </label>
      <button
        class="pressable dir-add dock-add"
        type="button"
        :disabled="!canAdd"
        aria-label="발송 등록"
        @click="save"
      >
        등록
      </button>
      </div>
    </template>
  </aside>
  <CompanyPicker :open="pickerOpen" @close="pickerOpen = false" @pick="pickCompany" />
</template>
