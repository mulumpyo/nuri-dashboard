const HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-DNS-Prefetch-Control": "off",
};

export const applySecurityHeaders = (res: { setHeader: (key: string, value: string) => void }) => {
  for (const [key, value] of Object.entries(HEADERS)) res.setHeader(key, value);
};
