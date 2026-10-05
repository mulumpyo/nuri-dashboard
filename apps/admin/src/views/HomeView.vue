<script lang="ts">
import { defineComponent, onUnmounted } from "vue";
import HomeBoard from "../components/HomeBoard.vue";
import { resetOverlay } from "../lib/chrome";

export default defineComponent({
  name: "HomeView",
  components: { HomeBoard },
  setup() {
    onUnmounted(() => {
      resetOverlay();
    });
    return {};
  },
});
</script>

<template>
  <main id="main" class="wrap">
    <HomeBoard />
  </main>
</template>
