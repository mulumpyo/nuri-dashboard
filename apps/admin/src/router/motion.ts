export const MENU = [
  { to: "/", label: "홈" },
  { to: "/companies", label: "업체" },
  { to: "/carriers", label: "택배사" },
  { to: "/accounts", label: "계정", users: true },
  { to: "/settings", label: "설정", trail: true },
] as const;

export type MenuPath = (typeof MENU)[number]["to"];

export const isAuth = (path: string) =>
  path.startsWith("/login") || path.startsWith("/invite") || path.startsWith("/recover");

export const menuList = (canManageUsers = true) =>
  MENU.filter((item) => !("users" in item && item.users) || canManageUsers);

export const menuMatch = (path: string, to: string) => (to === "/" ? path === "/" : path.startsWith(to));

export const menuIndex = (path: string, canManageUsers = true) =>
  menuList(canManageUsers).findIndex((item) => menuMatch(path, item.to));

export const menuLabel = (path: string) => MENU.find((item) => menuMatch(path, item.to))?.label ?? "";

export const menuKind = (path: string) => {
  if (path.startsWith("/companies") || path.startsWith("/carriers") || path.startsWith("/accounts")) return "dir";
  if (path.startsWith("/settings")) return "settings";
  return "home";
};

export const menuHops = (from: string, to: string, canManageUsers = true) => {
  const items = menuList(canManageUsers);
  const start = menuIndex(from, canManageUsers);
  const end = menuIndex(to, canManageUsers);
  if (start < 0 || end < 0 || start === end) return null;
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  return {
    dir: end > start ? 1 : -1,
    from: start - lo,
    to: end - lo,
    steps: Math.abs(end - start),
    paths: items.slice(lo, hi + 1).map((item) => item.to),
  };
};

export const menuTravelMs = (steps: number) => Math.min(720, 280 + Math.max(1, steps) * 110);

export const pageMotion = (to: string, from?: string) => {
  if (isAuth(to) || (from && isAuth(from))) return "page-auth";
  if (from && menuHops(from, to)) return "page-travel";
  return "page-fade";
};
