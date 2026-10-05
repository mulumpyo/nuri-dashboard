<script lang="ts">
import { defineComponent } from "vue";
import Chevron from "./Chevron.vue";

export default defineComponent({
  name: "PageHead",
  components: { Chevron },
  props: {
    title: { type: String, required: true },
    titleId: { type: String, default: "" },
    backTo: { type: String, default: "" },
    backLabel: { type: String, default: "설정" },
  },
  emits: ["back"],
});
</script>

<template>
  <div class="top-copy page-head" :class="{ 'has-back': backTo }">
    <button
      v-if="backTo"
      class="set-back"
      type="button"
      :aria-label="`${backLabel}으로`"
      @click="$emit('back')"
    >
      <Chevron />
    </button>
    <h1 :id="titleId || undefined" class="title">{{ title }}</h1>
  </div>
</template>
