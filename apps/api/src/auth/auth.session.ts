import type { Request, Response } from "express";
import { ACCESS_TTL_SEC } from "../domain/constants";
import type { ClientSite } from "./auth.types";

export const cookieSecure = (origin?: string, flag = process.env.COOKIE_SECURE) =>
  Boolean(origin?.startsWith("https://") || flag === "true");

export const clientSite = (req: Request): ClientSite => {
  const forwardedHost = String(req.headers["x-forwarded-host"] ?? "")
    .split(",")[0]
    .trim();
  const rawHost = forwardedHost || String(req.headers.host ?? "localhost:5173");
  const hostname = rawHost.split(":")[0] || "localhost";
  const proto = String(req.headers["x-forwarded-proto"] ?? req.protocol ?? "http")
    .split(",")[0]
    .trim();
  const defaultPort =
    (proto === "https" && rawHost.endsWith(":443")) || (proto === "http" && rawHost.endsWith(":80"));
  const host = defaultPort ? hostname : rawHost;
  return {
    origin: `${proto}://${host}`,
    hostname,
  };
};

export const attachCookies = (
  res: Response,
  access: string,
  refresh: string,
  refreshTtl: number,
  origin?: string,
) => {
  const secure = cookieSecure(origin);
  const common = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
  res.cookie("access", access, { ...common, maxAge: ACCESS_TTL_SEC * 1000 });
  res.cookie("refresh", refresh, { ...common, maxAge: refreshTtl * 1000 });
};

export const clearCookies = (res: Response, origin?: string) => {
  const secure = cookieSecure(origin);
  const common = { httpOnly: true, sameSite: "lax" as const, secure, path: "/" };
  res.clearCookie("access", common);
  res.clearCookie("refresh", common);
};
