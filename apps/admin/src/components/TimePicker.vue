<script lang="ts">
import { computed, defineComponent, nextTick, onUnmounted, ref, watch } from "vue";
import { nextShipTime, SHIP_HOURS, SHIP_MINUTES } from "@nuri/shared";
import { pad } from "../lib/day";
import { trapTab } from "../lib/focus";

export default defineComponent({
  name: "TimePicker",
  props: {
    modelValue: { type: String, default: "" },
    placeholder: { type: String, default: "시간" },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const open = ref(false);
    const sheet = ref(false);
    const trigger = ref<HTMLElement | null>(null);
    const pop = ref<HTMLElement | null>(null);
    const popId = `time-pop-${Math.random().toString(36).slice(2, 8)}`;
    const popStyle = ref<Record<string, string>>({});
    const hour = ref<number | null>(null);
    const minute = ref<number | null>(null);

    const label = computed(() => props.modelValue || props.placeholder);

    const read = (value: string) => {
      const [h, m] = value.split(":").map(Number);
      hour.value = Number.isInteger(h) ? h : null;
      minute.value = Number.isInteger(m) ? m : null;
    };

    const place = () => {
      sheet.value = window.innerWidth < 1024;
      if (sheet.value) {
        popStyle.value = {
          top: "auto",
          left: "12px",
          right: "12px",
          bottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          width: "auto",
        };
        return;
      }
      const box = trigger.value?.getBoundingClientRect();
      if (!box) return;
      const width = 280;
      let left = box.left + (box.width - width) / 2;
      if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - width - 12);
      if (left < 12) left = 12;
      popStyle.value = {
        top: `${box.bottom + 8}px`,
        left: `${left}px`,
        right: "auto",
        bottom: "auto",
        width: `${width}px`,
      };
    };

    const close = () => {
      open.value = false;
    };

    const commit = (nextHour: number | null, nextMinute: number | null) => {
      if (nextHour == null || nextMinute == null) return;
      emit("update:modelValue", `${pad(nextHour)}:${pad(nextMinute)}`);
      close();
    };

    const pickHour = (value: number) => {
      hour.value = value;
      commit(value, minute.value);
    };

    const pickMinute = (value: number) => {
      minute.value = value;
      commit(hour.value, value);
    };

    const onDoc = (event: MouseEvent) => {
      const node = event.target as Node;
      if (trigger.value?.contains(node) || pop.value?.contains(node)) return;
      close();
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopImmediatePropagation();
        close();
        return;
      }
      trapTab(event, pop.value);
    };

    watch(open, async (value) => {
      if (!value) {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey, true);
        window.removeEventListener("resize", place);
        trigger.value?.focus();
        return;
      }
      if (props.modelValue) read(props.modelValue);
      else read(nextShipTime());
      await nextTick();
      place();
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey, true);
      window.addEventListener("resize", place);
      pop.value?.querySelector<HTMLElement>("button")?.focus();
    });

    onUnmounted(() => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", place);
    });

    return {
      SHIP_HOURS,
      SHIP_MINUTES,
      open,
      popId,
      sheet,
      trigger,
      pop,
      popStyle,
      label,
      hour,
      minute,
      pad,
      toggle: () => {
        open.value = !open.value;
      },
      close,
      pickHour,
      pickMinute,
    };
  },
});
</script>

<template>
  <div class="cal time">
    <button
      ref="trigger"
      class="pressable cal-trigger pill glass-thin"
      type="button"
      :aria-expanded="open"
      aria-haspopup="dialog"
      :aria-controls="popId"
      :aria-label="modelValue ? `${modelValue} 발송 시간` : '발송 시간'"
      @click="toggle"
    >
      <svg class="cal-icon" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="6.6" fill="none" stroke="currentColor" stroke-width="1.5" />
        <path d="M10 6.4V10l2.4 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <span class="tabular">{{ label }}</span>
    </button>

    <Teleport to="body">
      <div v-if="open" class="cal-scrim" @mousedown="close" />
      <div
        v-if="open"
        :id="popId"
        ref="pop"
        class="cal-pop glass time-pop"
        :class="{ 'cal-pop-sheet': sheet }"
        role="dialog"
        aria-modal="true"
        aria-label="발송 시간"
        :style="popStyle"
      >
        <p class="caption time-head">시</p>
        <div class="time-grid hours" role="group" aria-label="시">
          <button
            v-for="value in SHIP_HOURS"
            :key="value"
            class="pressable cal-day"
            :class="{ on: hour === value }"
            type="button"
            :aria-pressed="hour === value"
            :aria-label="`${value}시`"
            @click="pickHour(value)"
          >
            {{ pad(value) }}
          </button>
        </div>
        <p class="caption time-head">분</p>
        <div class="time-grid mins" role="group" aria-label="분">
          <button
            v-for="value in SHIP_MINUTES"
            :key="value"
            class="pressable cal-day"
            :class="{ on: minute === value }"
            type="button"
            :aria-pressed="minute === value"
            :aria-label="`${value}분`"
            @click="pickMinute(value)"
          >
            {{ pad(value) }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
