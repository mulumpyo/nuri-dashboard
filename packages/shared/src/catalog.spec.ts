import { describe, expect, it } from "vitest";
import { BOARD_DAYS, PAY_TYPES, carrierNeedsTime, deviceTag, nextShipTime, parseShipTime, passwordIssue } from "./index";

describe("shared catalog", () => {
  it("keeps board and pay contracts", () => {
    expect(BOARD_DAYS).toBe(4);
    expect(PAY_TYPES).toEqual(["prepaid", "collect"]);
    expect(carrierNeedsTime("서울퀵")).toBe(true);
    expect(parseShipTime("14:30")).toBe("14:30");
    expect(nextShipTime(new Date("2026-09-23T00:05:00.000Z"))).toBe("09:30");
  });

  it("asks for a Korean mix of letters and numbers", () => {
    expect(passwordIssue("short")).toBe("비밀번호는 8자 이상이어야 해요");
    expect(passwordIssue("password")).toBe("문자와 숫자를 함께 넣어 주세요");
    expect(passwordIssue("12345678")).toBe("문자와 숫자를 함께 넣어 주세요");
    expect(passwordIssue("nuri-pass-1")).toBe("");
    expect(passwordIssue("한글비밀번호12")).toBe("");
    expect(deviceTag("3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21")).toBe("3E21");
  });
});
