import type { HomeMe } from "../lib/home-types";

export const publicPath = (path: string) =>
  path === "/login" || path.startsWith("/invite/") || path.startsWith("/recover/");

export const isAdminSession = (session: HomeMe | null) => Boolean(session && session.kind !== "device");

export const sessionTarget = (path: string, session: HomeMe | null) => {
  if (publicPath(path)) {
    return path === "/login" && isAdminSession(session) ? "/" : true;
  }
  if (!isAdminSession(session)) return "/login";
  if ((path === "/accounts" || path.startsWith("/settings/logs")) && !session?.canManageUsers) return "/";
  return true;
};
