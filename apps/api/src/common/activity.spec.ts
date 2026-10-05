import { ActivityService, actorFor, kindFor, loginFinished, normalizePath, searchTerm, talkFor } from "./activity";

describe("activity talk", () => {
  it("names known writes in Korean", () => {
    expect(talkFor("POST", "/api/companies")).toBe("업체를 등록했어요");
    expect(talkFor("PATCH", "/api/companies/3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21")).toBe("업체 이름을 바꿨어요");
    expect(talkFor("DELETE", "/api/holidays/2026-10-05")).toBe("쉬는 날을 지웠어요");
    expect(talkFor("POST", "/api/unknown")).toBe("작업을 처리했어요");
  });

  it("puts deleted or changed names into the sentence", () => {
    expect(talkFor("DELETE", "/api/companies/3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21", "한빛")).toBe("한빛 업체를 지웠어요");
    expect(talkFor("DELETE", "/api/auth/users/3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21", "kim@nuri.test")).toBe(
      "kim@nuri.test 계정을 지웠어요",
    );
    expect(talkFor("POST", "/api/auth/invites", "kim@nuri.test")).toBe("kim@nuri.test에 초대를 보냈어요");
    expect(talkFor("POST", "/api/auth/login/verify", "kim@nuri.test", false)).toBe("로그인에 실패했어요");
    expect(talkFor("DELETE", "/api/companies/3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21", "한빛", false)).toBe(
      "한빛 업체를 지웠어요 · 실패",
    );
    expect(searchTerm("한%빛_")).toBe("한빛");
    expect(talkFor("POST", "/api/devices/approve", "3E21 디스플레이")).toBe("3E21 디스플레이 화면을 연결했어요");
    expect(talkFor("POST", "/api/devices/claim", "3E21 디스플레이")).toBe("3E21 디스플레이 화면이 들어왔어요");
    expect(talkFor("POST", "/api/devices/3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21/revoke", "3E21 디스플레이")).toBe(
      "3E21 디스플레이 화면 연결을 끊었어요",
    );
    expect(talkFor("PATCH", "/api/auth/security", "비밀번호")).toBe("비밀번호로 로그인하게 바꿨어요");
    expect(talkFor("PATCH", "/api/auth/security", "인증 앱")).toBe("인증 앱으로 로그인하게 바꿨어요");
  });

  it("marks login paths", () => {
    expect(kindFor("POST", "/api/auth/login/verify")).toBe("login");
    expect(kindFor("POST", "/api/companies")).toBe("work");
  });

  it("keeps query strings out of the key", () => {
    expect(normalizePath("/api/companies?q=한빛")).toBe("/api/companies");
  });

  it("writes the screen tag after approve", async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    const db = {
      insert: jest.fn(() => ({ values })),
      select: jest.fn((cols?: Record<string, unknown>) => ({
        from: () => ({
          where: () => ({
            limit: jest.fn().mockResolvedValue(cols && "role" in cols ? [{ role: "owner" }] : [{ name: "디스플레이" }]),
          }),
        }),
      })),
    };
    const service = new ActivityService(db as never);
    await service.commit(
      { method: "POST", originalUrl: "/api/devices/approve", headers: {} },
      { kind: "work", email: "owner@nuri.test", detail: "", talk: "화면을 연결했어요", actor: "소유자" },
      true,
      { status: "ok", deviceId: "3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21" },
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        talk: "3E21 디스플레이 화면을 연결했어요",
        detail: "3E21 디스플레이",
      }),
    );
  });

  it("skips enroll-only register writes", async () => {
    const values = jest.fn();
    const service = new ActivityService({ insert: jest.fn(() => ({ values })) } as never);
    await service.commit(
      { method: "POST", originalUrl: "/api/auth/register", headers: {} },
      { kind: "login", email: "kim@nuri.test", detail: "kim@nuri.test", talk: "초대를 수락하고 들어왔어요", actor: "손님" },
      true,
      { mode: "enroll", challengeKey: "chal" },
    );
    expect(values).not.toHaveBeenCalled();
    expect(loginFinished({ mode: "enroll" })).toBe(false);
    expect(loginFinished({ status: "ok" })).toBe(true);
  });

  it("names the logged-in owner instead of a guest", async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    const db = {
      insert: jest.fn(() => ({ values })),
      select: jest.fn(() => ({
        from: () => ({
          where: () => ({
            limit: jest.fn().mockResolvedValue([{ role: "owner" }]),
          }),
        }),
      })),
    };
    const service = new ActivityService(db as never);
    await service.commit(
      { method: "POST", originalUrl: "/api/auth/login/verify", headers: {} },
      { kind: "login", email: "owner@nuri.test", detail: "owner@nuri.test", talk: "로그인했어요", actor: "손님" },
      true,
      { status: "ok" },
    );
    expect(values).toHaveBeenCalledWith(expect.objectContaining({ actor: "소유자", talk: "owner@nuri.test 로그인했어요" }));
  });

  it("labels a claimed screen", async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    const db = {
      insert: jest.fn(() => ({ values })),
      select: jest.fn(() => ({
        from: () => ({
          where: () => ({
            limit: jest.fn().mockResolvedValue([{ name: "디스플레이" }]),
          }),
        }),
      })),
    };
    const service = new ActivityService(db as never);
    await service.commit(
      { method: "POST", originalUrl: "/api/devices/claim", headers: {} },
      { kind: "work", email: "", detail: "", talk: "화면이 들어왔어요", actor: "손님" },
      true,
      { status: "ok", deviceId: "3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21" },
    );
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: "화면",
        talk: "3E21 디스플레이 화면이 들어왔어요",
      }),
    );
  });

  it("labels who did the work", () => {
    expect(actorFor({ kind: "admin", role: "owner" })).toBe("소유자");
    expect(actorFor({ kind: "admin", role: "admin" })).toBe("관리자");
    expect(actorFor({ kind: "device" })).toBe("화면");
    expect(actorFor()).toBe("손님");
  });
});
