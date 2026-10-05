<script lang="ts">
import { defineComponent, nextTick, onMounted, onUnmounted, ref } from "vue";
import { trapTab } from "../lib/focus";

export default defineComponent({
  name: "FormDialog",
  props: {
    title: { type: String, required: true },
    confirmLabel: { type: String, default: "등록" },
    busy: { type: Boolean, default: false },
  },
  emits: ["cancel", "confirm"],
  setup(props, { emit }) {
    const card = ref<HTMLElement | null>(null);
    let previous: HTMLElement | null = null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !props.busy) {
        event.stopImmediatePropagation();
        emit("cancel");
        return;
      }
      trapTab(event, card.value);
    };
    const onBackdrop = () => {
      if (!props.busy) emit("cancel");
    };
    onMounted(() => {
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener("keydown", onKey, true);
      void nextTick(() => {
        const first = card.value?.querySelector<HTMLElement>("input, textarea, select");
        (first ?? document.getElementById("form-cancel"))?.focus();
      });
    });
    onUnmounted(() => {
      document.removeEventListener("keydown", onKey, true);
      previous?.focus();
    });
    return { card, onBackdrop };
  },
});
</script>

<template>
  <Teleport to="body">
    <div class="confirm-root" @mousedown.self="onBackdrop">
      <section
        ref="card"
        class="confirm-card form-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
      >
        <form class="form-body" @submit.prevent="$emit('confirm')">
          <div class="form-head">
            <button
              id="form-cancel"
              class="dialog-btn"
              type="button"
              :disabled="busy"
              @click="$emit('cancel')"
            >
              취소
            </button>
            <h2 id="form-title" class="title">{{ title }}</h2>
            <button class="dialog-btn on" type="submit" :disabled="busy" :aria-busy="busy">
              {{ confirmLabel }}
            </button>
          </div>
          <slot />
        </form>
      </section>
    </div>
  </Teleport>
</template>
