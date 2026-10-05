export const TIMEZONE = "Asia/Seoul";

export const kstDate = (now = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const parseDate = (value: string): Date => {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const addDays = (value: string, days: number): string => {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const weekday = (value: string): number => parseDate(value).getUTCDay();

export const isWeekend = (value: string): boolean => {
  const day = weekday(value);
  return day === 0 || day === 6;
};

export const weekdayLabel = (value: string): string => {
  const labels = ["일", "월", "화", "수", "목", "금", "토"];
  return labels[weekday(value)];
};

export const dayLabel = (date: string, today: string): string => {
  if (date === today) return "오늘";
  if (date === addDays(today, 1)) return "내일";
  return weekdayLabel(date);
};

export const collectBusinessDays = (
  from: string,
  count: number,
  holidays: Set<string>,
): string[] => {
  const days: string[] = [];
  let cursor = from;
  while (days.length < count) {
    if (!isWeekend(cursor) && !holidays.has(cursor)) days.push(cursor);
    cursor = addDays(cursor, 1);
    if (days.length === 0 && cursor > addDays(from, 40)) break;
  }
  return days;
};
