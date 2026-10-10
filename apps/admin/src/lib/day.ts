export const pad = (n: number) => String(n).padStart(2, "0");

export const formatDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const parseDay = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
};

export const kstToday = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

const parseYmd = (value: string) => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const addDays = (value: string, days: number) => {
  const date = parseYmd(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const isWeekend = (value: string) => {
  const day = parseYmd(value).getUTCDay();
  return day === 0 || day === 6;
};

const MAX_SHIFT = 800;

export const shiftBusinessDay = (value: string, dir: -1 | 1, holidays: readonly string[] = []) => {
  const blocked = new Set(holidays);
  let cursor = value;
  for (let i = 0; i < MAX_SHIFT; i++) {
    cursor = addDays(cursor, dir);
    if (!isWeekend(cursor) && !blocked.has(cursor)) return cursor;
  }
  return "";
};
