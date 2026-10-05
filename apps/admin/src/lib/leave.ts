import { isUnauthorized } from "../api";

export const leaveIfAuth = async (
  err: unknown,
  leave: () => Promise<unknown>,
  say?: (text: string) => void,
) => {
  if (isUnauthorized(err)) {
    await leave();
    return true;
  }
  say?.(err instanceof Error ? err.message : "다시 시도해 주세요");
  return false;
};
