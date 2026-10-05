<script lang="ts">
import { computed, defineComponent, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { passwordIssue } from "@nuri/shared";
import { api } from "../api";
import TotpEnroll from "../components/TotpEnroll.vue";

type Enrolled = { mode?: "enroll" | "ready"; challengeKey?: string; qr?: string; secret?: string };
type InviteBlock = "expired" | "used" | "missing";

const INVITE_BLOCK: Record<InviteBlock, { title: string; lead: string }> = {
  expired: { title: "초대가 만료됐어요", lead: "관리자에게 다시 초대해 달라고 해 주세요" },
  used: { title: "이미 사용한 초대예요", lead: "로그인해서 들어와 주세요" },
  missing: { title: "초대 링크가 없어요", lead: "메일 속 링크를 다시 확인해 주세요" },
};

const RECOVERY_BLOCK: Record<InviteBlock, { title: string; lead: string }> = {
  expired: { title: "비밀번호 링크가 만료됐어요", lead: "로그인에서 다시 받아 주세요" },
  used: { title: "이미 사용한 링크예요", lead: "로그인해서 들어와 주세요" },
  missing: { title: "비밀번호 링크가 없어요", lead: "메일 속 링크를 다시 확인해 주세요" },
};

export default defineComponent({
  name: "InviteView",
  components: { TotpEnroll },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const code = ref("");
    const password = ref("");
    const confirmPassword = ref("");
    const message = ref("");
    const totpRequired = ref(true);
    const enrolled = ref<Enrolled | null>(null);
    const blocked = ref<InviteBlock | null>(null);
    const ready = ref(false);
    const recovery = computed(() => route.path.startsWith("/recover"));
    const withPassword = computed(() => !totpRequired.value);
    const blockCopy = computed(() =>
      recovery.value ? RECOVERY_BLOCK : INVITE_BLOCK,
    );
    const title = computed(() => {
      if (blocked.value) {
        if (recovery.value && blocked.value === "expired" && totpRequired.value) {
          return "복구 링크가 만료됐어요";
        }
        return blockCopy.value[blocked.value].title;
      }
      if (recovery.value) return withPassword.value ? "비밀번호 다시 만들기" : "인증 앱 다시 등록";
      return "초대를 수락할게요";
    });
    const lead = computed(() => {
      if (blocked.value) return blockCopy.value[blocked.value].lead;
      if (recovery.value) {
        return withPassword.value ? "새 비밀번호를 만들면 바로 들어와요" : "새 QR로 인증 앱을 연결해요";
      }
      return withPassword.value ? "비밀번호를 만들면 바로 시작할 수 있어요" : "인증 앱만 있으면 바로 시작할 수 있어요";
    });

    onMounted(async () => {
      try {
        const security = await api.get<{ totpRequired: boolean }>("/api/auth/security");
        totpRequired.value = security.totpRequired;
      } catch {
        totpRequired.value = false;
      }
      try {
        const kind = recovery.value ? "recovery" : "invite";
        const peek = await api.get<{ status?: string }>(`/api/auth/${kind}/${route.params.token}`);
        if (peek.status === "expired" || peek.status === "used" || peek.status === "missing") {
          blocked.value = peek.status;
        }
      } catch {
        blocked.value = recovery.value ? "expired" : "missing";
      }
      ready.value = true;
    });

    const begin = async () => {
      if (withPassword.value) {
        const issue = passwordIssue(password.value);
        if (issue) {
          message.value = issue;
          return;
        }
        if (password.value !== confirmPassword.value) {
          message.value = "비밀번호가 서로 달라요";
          return;
        }
      }
      try {
        const path = recovery.value ? "/api/auth/recovery/start" : "/api/auth/register";
        enrolled.value = await api.post<Enrolled>(path, {
          token: String(route.params.token),
          password: withPassword.value ? password.value : undefined,
        });
        if (enrolled.value.mode === "ready") {
          await router.replace("/");
          return;
        }
        message.value = "인증 앱에서 QR을 스캔한 뒤 번호를 입력해 주세요";
      } catch (err) {
        const text = err instanceof Error ? err.message : "잠시 후 다시 시도해 주세요";
        if (text.includes("만료")) blocked.value = "expired";
        else if (text.includes("사용한")) blocked.value = "used";
        else if (text.includes("없어요")) blocked.value = "missing";
        else message.value = text;
      }
    };

    const confirm = async () => {
      try {
        await api.post("/api/auth/register/verify", { challengeKey: enrolled.value?.challengeKey, code: code.value });
        await router.replace("/");
      } catch (err) {
        message.value = err instanceof Error ? err.message : "번호가 맞지 않아요";
      }
    };

    return {
      code,
      password,
      confirmPassword,
      message,
      enrolled,
      blocked,
      ready,
      recovery,
      withPassword,
      title,
      lead,
      begin,
      confirm,
      goLogin: () => router.replace("/login"),
    };
  },
});
</script>

<template>
  <main id="main" class="center">
    <section class="glass auth-card">
      <p class="caption">누리디에스엠</p>
      <h1 class="title">{{ title }}</h1>
      <p class="caption auth-lead">{{ lead }}</p>
      <template v-if="ready && !blocked">
        <div v-if="withPassword && !enrolled" class="field-shell glass-thin">
          <input
            id="invite-password"
            v-model="password"
            class="field"
            type="password"
            autocomplete="new-password"
            aria-label="비밀번호"
            placeholder="비밀번호"
          />
        </div>
        <div v-if="withPassword && !enrolled" class="field-shell glass-thin">
          <input
            id="invite-password-confirm"
            v-model="confirmPassword"
            class="field"
            type="password"
            autocomplete="new-password"
            aria-label="비밀번호 확인"
            placeholder="비밀번호 확인"
            @keyup.enter="begin"
          />
        </div>
        <Transition name="auth-step">
          <TotpEnroll
            v-if="enrolled && enrolled.mode !== 'ready'"
            :qr="enrolled.qr"
            :secret="enrolled.secret"
            enroll
            :code="code"
            @update:code="code = $event"
            @confirm="confirm"
          />
        </Transition>
        <button
          v-if="enrolled && enrolled.mode !== 'ready'"
          class="pressable glass action wide"
          type="button"
          @click="confirm"
        >
          시작하기
        </button>
        <button v-else-if="!enrolled" class="pressable glass action wide" type="button" @click="begin">
          {{ withPassword ? "시작하기" : "다음" }}
        </button>
        <p v-if="message" class="caption auth-msg" role="alert" aria-live="assertive">{{ message }}</p>
      </template>
      <button v-else-if="blocked" class="pressable glass action wide" type="button" @click="goLogin">
        로그인
      </button>
    </section>
  </main>
</template>
