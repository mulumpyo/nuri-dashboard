<script lang="ts">
import { computed, defineComponent } from "vue";
import { menuLabel } from "../router/motion";

export default defineComponent({
  name: "MenuGhost",
  props: {
    path: { type: String, required: true },
  },
  setup(props) {
    return { title: computed(() => menuLabel(props.path)) };
  },
});
</script>

<template>
  <h1 class="title menu-ghost-title">{{ title }}</h1>
</template>
