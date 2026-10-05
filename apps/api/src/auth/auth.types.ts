export type TokenKind = "admin" | "device";

export type ClientSite = { origin: string; hostname: string };

export type AccessClaims = {
  sub: string;
  kind: TokenKind;
  role?: string;
  deviceId?: string;
  jti?: string;
};

export type RefreshRecord = {
  userId: string;
  family: string;
  kind: TokenKind;
  deviceId?: string;
};
