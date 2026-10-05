import { ref } from "vue";
import { api } from "../api";
import type { HomeMe } from "./home-types";

export const me = ref<HomeMe | null>(null);

let pending: Promise<HomeMe | null> | null = null;

export const loadMe = async (force = false) => {
  if (!force && me.value) return me.value;
  if (!force && pending) return pending;
  pending = api
    .get<HomeMe>("/api/auth/me")
    .then((next) => {
      me.value = next;
      return next;
    })
    .catch(() => {
      me.value = null;
      return null;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
};

export const clearMe = () => {
  me.value = null;
};
