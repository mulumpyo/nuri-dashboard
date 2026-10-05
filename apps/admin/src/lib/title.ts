export const BRAND = "누리디에스엠";

export const namedTitle = (name: string) => `${BRAND} | ${name}`;

export const pageTitle = (path: string) => {
  if (path.startsWith("/login")) return namedTitle("로그인");
  if (path.startsWith("/invite")) return namedTitle("초대");
  if (path.startsWith("/recover")) return namedTitle("인증 복구");
  if (path.startsWith("/companies")) return namedTitle("업체");
  if (path.startsWith("/carriers")) return namedTitle("택배사");
  if (path.startsWith("/accounts")) return namedTitle("계정");
  if (path.startsWith("/settings/logs")) return namedTitle("로그 기록");
  if (path.startsWith("/settings")) return namedTitle("설정");
  return namedTitle("오늘 보낼 업체");
};
