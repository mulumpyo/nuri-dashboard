const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const stamp = (iso: string) => {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return null;
  return { month, day, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay() };
};

export const formatBoardDay = (iso: string) => {
  const parts = stamp(iso);
  return parts ? `${parts.month}월 ${parts.day}일` : iso;
};

export const formatBoardWeekday = (iso: string) => {
  const parts = stamp(iso);
  return parts ? (WEEKDAYS[parts.weekday] ?? "") : "";
};

export const formatBoardDate = (iso: string) => {
  const weekday = formatBoardWeekday(iso);
  return weekday ? `${formatBoardDay(iso)} (${weekday})` : iso;
};
