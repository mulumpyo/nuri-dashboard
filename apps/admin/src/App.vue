<script lang="ts">
import { computed, defineComponent } from "vue";
import { useRoute } from "vue-router";
import AppNav from "./components/AppNav.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import PageTravel from "./components/PageTravel.vue";
import { overlay, usePrompt, useToast } from "./lib/chrome";
import { isAuth } from "./router/motion";

export default defineComponent({
  name: "App",
  components: { AppNav, ConfirmDialog, PageTravel },
  setup() {
    const route = useRoute();
    const { toast } = useToast();
    const { prompt, promptBusy, cancelPrompt, confirmPrompt } = usePrompt();
    const showNav = computed(() => !isAuth(route.path));

    return { showNav, toast, overlay, prompt, promptBusy, cancelPrompt, confirmPrompt };
  },
});
</script>

<template>
  <a class="skip" href="#main">본문으로 건너뛰기</a>
  <div class="app-shell" :class="{ 'app-shell-nav': showNav }">
    <transition name="nav-fade">
      <div v-if="showNav" class="wrap app-bar">
        <AppNav />
      </div>
    </transition>
    <div class="app-main">
      <router-view v-slot="{ Component, route }">
        <PageTravel :view="Component" :path="route.path" />
      </router-view>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="toast"
      class="toast"
      :class="{ 'toast-over': overlay.sheet || prompt }"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ toast }}
    </div>
  </Teleport>

  <ConfirmDialog
    v-if="prompt"
    :title="prompt.title"
    :message="prompt.message"
    :confirm-label="prompt.confirmLabel ?? '삭제'"
    :danger="prompt.danger !== false"
    :busy="promptBusy"
    @cancel="cancelPrompt"
    @confirm="confirmPrompt"
  />
</template>
