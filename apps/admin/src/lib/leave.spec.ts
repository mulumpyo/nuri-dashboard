import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api";
import { leaveIfAuth } from "./leave";

describe("leaveIfAuth", () => {
  it("leaves only on 401", async () => {
    const leave = vi.fn(async () => undefined);
    const say = vi.fn();
    await leaveIfAuth(new ApiError(401, "로그인이 필요해요"), leave, say);
    expect(leave).toHaveBeenCalledOnce();
    expect(say).not.toHaveBeenCalled();
    leave.mockClear();
    await leaveIfAuth(new Error("보드를 불러오지 못했어요"), leave, say);
    expect(leave).not.toHaveBeenCalled();
    expect(say).toHaveBeenCalledWith("보드를 불러오지 못했어요");
  });
});
