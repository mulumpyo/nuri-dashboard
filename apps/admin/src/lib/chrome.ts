import { getCurrentInstance, onUnmounted, reactive, ref, watch } from "vue";
import { setInert } from "./focus";
import type { HomePrompt } from "./home-types";

const toast = ref("");
let timer: ReturnType<typeof setTimeout> | undefined;
let users = 0;

export const useToast = (ms = 2200) => {
  const say = (text: string) => {
    toast.value = text;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      toast.value = "";
      timer = undefined;
    }, ms);
  };

  const clearToast = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    toast.value = "";
  };

  if (getCurrentInstance()) {
    users += 1;
    onUnmounted(() => {
      users -= 1;
      if (users <= 0) clearToast();
    });
  }

  return { toast, say, clearToast };
};

export const overlay = reactive({
  picker: false,
  sheet: false,
  prompt: false,
});

const applyOverlay = () => {
  if (typeof document === "undefined") return;
  const on = overlay.picker || overlay.sheet || overlay.prompt;
  document.body.style.overflow = on ? "hidden" : "";
  setInert(on, ".skip", "#main");
};

watch(overlay, applyOverlay);

export const resetOverlay = () => {
  overlay.picker = false;
  overlay.sheet = false;
  overlay.prompt = false;
  applyOverlay();
};

const prompt = ref<HomePrompt | null>(null);
const promptBusy = ref(false);

watch(prompt, (value) => {
  overlay.prompt = Boolean(value);
});

export const usePrompt = () => {
  const { say } = useToast();

  const ask = (next: HomePrompt) => {
    prompt.value = next;
  };

  const cancelPrompt = () => {
    if (!promptBusy.value) prompt.value = null;
  };

  const confirmPrompt = async () => {
    if (!prompt.value || promptBusy.value) return;
    promptBusy.value = true;
    const job = prompt.value;
    try {
      await job.run();
      prompt.value = null;
      if (job.done) say(job.done);
    } catch (err) {
      say(err instanceof Error ? err.message : "다시 시도해 주세요");
    } finally {
      promptBusy.value = false;
    }
  };

  return { prompt, promptBusy, ask, cancelPrompt, confirmPrompt };
};
