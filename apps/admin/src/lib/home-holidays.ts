import { computed, ref } from "vue";
import { api } from "../api";
import type { Holiday } from "./home-types";

export const holidays = ref<Holiday[]>([]);
export const holidayDates = computed(() => holidays.value.map((row) => row.date));

let pending: Promise<Holiday[]> | null = null;
let loaded = false;

export const loadHolidays = async (force = false) => {
  if (!force && loaded) return holidays.value;
  if (!force && pending) return pending;
  pending = api
    .get<Holiday[]>("/api/holidays")
    .then((rows) => {
      holidays.value = rows;
      loaded = true;
      return rows;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
};

export const resetHolidays = () => {
  holidays.value = [];
  loaded = false;
  pending = null;
};
