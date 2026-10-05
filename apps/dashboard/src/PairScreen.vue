<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "PairScreen",
  props: {
    hint: { type: String, required: true },
    code: { type: String, required: true },
    digits: { type: Array as () => string[], required: true },
  },
  emits: ["copy"],
});
</script>

<template>
  <main id="main" class="pair">
    <section class="glass pair-card">
      <h1 class="sr-only">화면 연결</h1>
      <p class="caption">{{ hint }}</p>
      <p class="code" role="group" :aria-label="`승인 코드 ${code}`" @copy="$emit('copy', $event)">
        <span v-for="(digit, index) in digits" :key="index" class="code-cell tabular" aria-hidden="true">{{
          digit.trim()
        }}</span>
      </p>
    </section>
  </main>
</template>
