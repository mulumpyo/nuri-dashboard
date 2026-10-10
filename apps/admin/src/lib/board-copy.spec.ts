import { describe, expect, it } from "vitest";
import { boardTitle, composeLabel, emptyBoardHint } from "./board-copy";

describe("board copy", () => {
  it("names today, tomorrow, and a calendar day", () => {
    expect(boardTitle()).toBe("보낼 업체");
    expect(boardTitle({ date: "2026-10-03", isToday: true })).toBe("오늘 보낼 업체");
    expect(boardTitle({ date: "2026-10-04", isTomorrow: true })).toBe("내일 보낼 업체");
    expect(boardTitle({ date: "2026-10-08" })).toBe("10월 8일에 보낼 업체");
  });

  it("tells an empty board to register after picking", () => {
    expect(emptyBoardHint).toBe("아래에서 업체를 고른 뒤 등록을 눌러 주세요");
  });

  it("joins dock fields for the add control", () => {
    expect(composeLabel({ payType: "prepaid" })).toBe("보낼 업체 추가");
    expect(composeLabel({ dayText: "수", company: "한빛", carrier: "CJ", payType: "collect", time: "14:30" })).toBe(
      "수 · 한빛 · CJ · 착불 · 14:30",
    );
    expect(
      composeLabel({ dayText: "오늘", company: "한빛", carrier: "퀵발송", payType: "prepaid", note: "7일건" }),
    ).toBe("오늘 · 한빛 · 퀵발송 · 선불 · 7일건");
  });
});
