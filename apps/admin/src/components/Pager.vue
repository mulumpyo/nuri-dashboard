<script lang="ts">
import { defineComponent } from "vue";
import Chevron from "./Chevron.vue";

export default defineComponent({
  name: "Pager",
  components: { Chevron },
  props: {
    page: { type: Number, required: true },
    pages: { type: Number, required: true },
    total: { type: Number, default: 0 },
    unit: { type: String, default: "" },
    label: { type: String, required: true },
    compact: { type: Boolean, default: false },
    steady: { type: Boolean, default: false },
  },
  emits: ["change"],
  setup(props, { emit }) {
    const go = (next: number) => {
      if (next < 1 || next > props.pages || next === props.page) return;
      emit("change", next);
    };

    return { go };
  },
});
</script>

<template>
  <nav class="pager" :class="{ compact }" :aria-label="label">
    <div v-if="pages > 1 || steady" class="pager-track">
      <button
        class="pager-step"
        type="button"
        :disabled="page <= 1"
        aria-label="이전 페이지"
        @click="go(page - 1)"
      >
        <Chevron />
      </button>
      <p class="pager-status" aria-live="polite">
        <span class="tabular">{{ page }}</span>
        <span aria-hidden="true"> / </span>
        <span class="sr-only"> / </span>
        <span class="tabular">{{ pages }}</span>
      </p>
      <button
        class="pager-step"
        type="button"
        :disabled="page >= pages"
        aria-label="다음 페이지"
        @click="go(page + 1)"
      >
        <Chevron dir="next" />
      </button>
    </div>
    <p v-if="total" class="caption pager-meta">
      <span class="tabular">{{ total }}</span>{{ unit }}
    </p>
  </nav>
</template>
