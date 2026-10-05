<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  name: "TotpEnroll",
  props: {
    qr: { type: String, default: "" },
    secret: { type: String, default: "" },
    code: { type: String, default: "" },
    enroll: { type: Boolean, default: false },
  },
  emits: ["update:code", "confirm"],
  setup(_, { emit }) {
    const onInput = (event: Event) => {
      emit("update:code", (event.target as HTMLInputElement).value);
    };
    const onEnter = () => {
      emit("confirm");
    };
    return { onInput, onEnter };
  },
});
</script>

<template>
  <div>
    <template v-if="enroll">
      <img v-if="qr" class="qr" :src="qr" alt="인증 앱 QR" />
      <p class="caption">앱에 계정이 없으면 아래 키를 직접 넣어 주세요</p>
      <p class="secret">{{ secret }}</p>
    </template>
    <div class="field-shell glass-thin">
      <input
        id="totp-code"
        class="field"
        inputmode="numeric"
        maxlength="6"
        autocomplete="one-time-code"
        aria-label="인증 번호 6자리"
        placeholder="인증 번호 6자리"
        :value="code"
        @input="onInput"
        @keyup.enter="onEnter"
      />
    </div>
  </div>
</template>
