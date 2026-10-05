<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { passwordIssue } from "@nuri/shared";
import { api } from "../api";
import TotpEnroll from "../components/TotpEnroll.vue";

type Started = {
  mode?: "login" | "enroll" | "ready" | "password" | "set-password";
  email?: string;
  challengeKey?: string;
  qr?: string;
  secret?: string;
};

export default defineComponent({
  name: "LoginView",
  components: { TotpEnroll },
  setup() {
    const email = ref("");
    const code = ref("");
    const password = ref("");
    const confirmPassword = ref("");
    const message = ref("");
    const totpRequired = ref(false);
    const started = ref<Started | null>(null);
    const sending = ref(false);
    const router = useRouter();
    const needsPassword = computed(
      () => started.value?.mode === "password" || started.value?.mode === "set-password",
    );
    const settingPassword = computed(() => started.value?.mode === "set-password");
    const canRecover = computed(
      () => started.value?.mode === "password" || started.value?.mode === "login",
    );
    const title = computed(() => {
      if (settingPassword.value) return "비밀번호 만들기";
      if (needsPassword.value) return "비밀번호로 들어오기";
      if (started.value && started.value.mode !== "ready") return "인증 번호 입력";
      return "이메일로 시작하기";
    });

    onMounted(async () => {
      await nextTick();
      document.getElementById("login-email")?.focus();
      try {
        const security = await api.get<{ totpRequired: boolean }>("/api/auth/security");
        totpRequired.value = security.totpRequired;
      } catch {
        totpRequired.value = false;
      }
    });

    const begin = async () => {
      if (sending.value) return;
      sending.value = true;
      try {
        started.value = await api.post<Started>("/api/auth/login", { email: email.value });
        if (started.value.mode === "ready") {
          await router.replace("/");
          return;
        }
        if (started.value.mode === "set-password") {
          message.value = "처음이니 비밀번호를 만들어 주세요";
          await nextTick();
          document.getElementById("login-password")?.focus();
          return;
        }
        if (started.value.mode === "password") {
          message.value = "";
          await nextTick();
          document.getElementById("login-password")?.focus();
          return;
        }
        message.value =
          started.value.mode === "enroll"
            ? "인증 앱에서 QR을 스캔한 뒤 번호를 입력해 주세요"
            : "인증 앱에 보이는 6자리 번호를 입력해 주세요";
      } catch (err) {
        message.value = err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요";
      } finally {
        sending.value = false;
      }
    };

    const confirm = async () => {
      if (sending.value) return;
      if (settingPassword.value) {
        const issue = passwordIssue(password.value);
        if (issue) {
          message.value = issue;
          return;
        }
        if (password.value !== confirmPassword.value) {
          message.value = "비밀번호가 서로 달라요";
          return;
        }
      } else if (password.value.length < 8) {
        message.value = "비밀번호는 8자 이상이어야 해요";
        return;
      }
      sending.value = true;
      try {
        await api.post("/api/auth/login/verify", {
          email: email.value,
          code: code.value,
          password: password.value || undefined,
          challengeKey: started.value?.challengeKey,
        });
        await router.replace("/");
      } catch (err) {
        message.value = err instanceof Error ? err.message : "다시 확인해 주세요";
      } finally {
        sending.value = false;
      }
    };

    const recover = async () => {
      if (!email.value) return;
      await api.post("/api/auth/recovery", { email: email.value });
      message.value = totpRequired.value ? "복구 메일을 보냈어요" : "비밀번호 메일을 보냈어요";
    };

    const back = async () => {
      started.value = null;
      password.value = "";
      confirmPassword.value = "";
      code.value = "";
      message.value = "";
      await nextTick();
      document.getElementById("login-email")?.focus();
    };

    const submit = () => {
      if (!started.value) return begin();
      if (started.value.mode === "ready") return;
      return confirm();
    };

    return {
      email,
      code,
      password,
      confirmPassword,
      message,
      totpRequired,
      started,
      needsPassword,
      settingPassword,
      canRecover,
      title,
      begin,
      confirm,
      recover,
      back,
      submit,
    };
  },
});
</script>

<template>
  <main id="main" class="center">
    <section class="glass auth-card">
      <form @submit.prevent="submit">
      <p class="caption">누리디에스엠</p>
      <h1 class="title">{{ title }}</h1>
      <p class="caption auth-lead">{{ totpRequired ? "인증 앱으로 로그인해요" : "비밀번호로 로그인해요" }}</p>
      <div class="field-shell glass-thin">
        <input
          id="login-email"
          v-model="email"
          class="field"
          type="email"
          inputmode="email"
          autocomplete="username"
          aria-label="이메일 주소"
          placeholder="이메일 주소"
          autofocus
          :disabled="Boolean(started)"
        />
      </div>
      <Transition name="auth-step">
        <div v-if="needsPassword" class="auth-extra">
          <div class="field-shell glass-thin">
            <input
              id="login-password"
              v-model="password"
              class="field"
              type="password"
              :autocomplete="settingPassword ? 'new-password' : 'current-password'"
              aria-label="비밀번호"
              placeholder="비밀번호"
            />
          </div>
          <div v-if="settingPassword" class="field-shell glass-thin">
            <input
              id="login-password-confirm"
              v-model="confirmPassword"
              class="field"
              type="password"
              autocomplete="new-password"
              aria-label="비밀번호 확인"
              placeholder="비밀번호 확인"
            />
          </div>
        </div>
      </Transition>
      <Transition name="auth-step">
        <TotpEnroll
          v-if="started && started.mode !== 'ready' && !needsPassword"
          :qr="started.qr"
          :secret="started.secret"
          :enroll="started.mode === 'enroll'"
          :code="code"
          @update:code="code = $event"
          @confirm="confirm"
        />
      </Transition>
      <button v-if="!started" class="pressable glass action wide" type="submit" @click.prevent="submit">다음</button>
      <button
        v-else-if="started.mode !== 'ready'"
        class="pressable glass action wide"
        type="submit"
        @click.prevent="submit"
      >
        {{ settingPassword ? "만들기" : "로그인" }}
      </button>
      <button
        v-if="started && started.mode !== 'ready'"
        class="pressable ghost auth-back"
        type="button"
        aria-label="이메일 다시 입력"
        @click="back"
      >
        이메일 다시 입력
      </button>
      <button v-if="canRecover" class="pressable ghost auth-sub" type="button" @click="recover">
        {{ totpRequired ? "코드를 잊었어요" : "비밀번호를 잊었어요" }}
      </button>
      <p v-if="message" class="caption auth-msg" role="alert" aria-live="assertive">{{ message }}</p>
      </form>
    </section>
  </main>
</template>
