export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const PASSWORD_MIX = /(?=.*[A-Za-z가-힣])(?=.*\d)/;

export const passwordIssue = (password?: string) => {
  const value = password ?? "";
  if (value.length < PASSWORD_MIN) return "비밀번호는 8자 이상이어야 해요";
  if (value.length > PASSWORD_MAX) return "비밀번호가 너무 길어요";
  if (!PASSWORD_MIX.test(value)) return "문자와 숫자를 함께 넣어 주세요";
  return "";
};

export const BOARD_DAYS = 4;
export const ACCESS_TTL_SEC = 12 * 60 * 60;
export const REFRESH_TTL_SEC = 30 * 24 * 60 * 60;
export const DEVICE_REFRESH_TTL_SEC = 180 * 24 * 60 * 60;
export const PAIRING_TTL_SEC = 30 * 60;

export const ROLES = ["owner", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const HOLIDAY_SOURCES = ["api", "manual"] as const;
export type HolidaySource = (typeof HOLIDAY_SOURCES)[number];

export const SSE_TYPES = [
  "shipment.changed",
  "day.boundary",
  "device.revoked",
  "heartbeat",
] as const;
export type SseType = (typeof SSE_TYPES)[number];

export type SsePayload = {
  type: SseType | (string & {});
  date?: string;
  shipmentId?: string;
  deviceId?: string;
};

export const deviceTag = (id: string) => id.replace(/-/g, "").slice(-4).toUpperCase();

export const PAY_TYPES = ["prepaid", "collect"] as const;
export type PayType = (typeof PAY_TYPES)[number];

export const PAY_TYPE_LABEL: Record<PayType, string> = {
  prepaid: "선불",
  collect: "착불",
};

export const SHIP_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const SHIP_HOURS = Array.from({ length: 13 }, (_, i) => i + 8);
export const SHIP_MINUTES = [0, 30] as const;

export const carrierNeedsTime = (name: string) => name.includes("퀵");

export const parseShipTime = (value?: string | null) => {
  const next = value?.trim() ?? "";
  return SHIP_TIME.test(next) ? next : null;
};

export const nextShipTime = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  let hour = Number(parts.find((row) => row.type === "hour")?.value ?? 8);
  let minute = Number(parts.find((row) => row.type === "minute")?.value ?? 0);
  if (minute === 0) {
    /* keep */
  } else if (minute <= 30) minute = 30;
  else {
    hour += 1;
    minute = 0;
  }
  if (hour < 8) return "08:00";
  if (hour > 20 || (hour === 20 && minute > 30)) return "20:30";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export type BoardCompany = {
  companyId: string;
  name: string;
  boxCount: number;
  shipmentId: string;
  payType: PayType;
  shipTime: string | null;
};

export type BoardCarrier = {
  carrierId: string;
  name: string;
  companies: BoardCompany[];
};

export type BoardDay = {
  date: string;
  label: string;
  isToday: boolean;
  isTomorrow: boolean;
  carriers: BoardCarrier[];
};

export type HolidaySync = {
  status: "idle" | "ok" | "degraded";
  at: string | null;
  count: number;
  message?: string;
};

export type BoardResponse = {
  from: string;
  timezone: "Asia/Seoul";
  days: BoardDay[];
};

export type Carrier = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};
