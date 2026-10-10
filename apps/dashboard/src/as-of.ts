export const STAMP = /^\d{4}-\d{2}-\d{2}$/;

export const kstStamp = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const readAsOf = (search = window.location.search) => {
  const raw = new URLSearchParams(search).get("asOf") ?? "";
  return STAMP.test(raw) ? raw : "";
};

export const writeAsOf = (value: string, href = window.location.href) => {
  const url = new URL(href, window.location.origin);
  if (value) url.searchParams.set("asOf", value);
  else url.searchParams.delete("asOf");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(null, "", next);
  return value;
};

export const shiftStamp = (value: string, days: number) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
