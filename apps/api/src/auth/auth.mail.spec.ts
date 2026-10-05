import { inviteMail, recoveryMail } from "./auth.mail";

describe("auth mail", () => {
  it("keeps invite and recovery on the same card layout", () => {
    const invite = inviteMail("https://nuri.example/invite/tok?x=1&y=2", false);
    const recovery = recoveryMail("https://nuri.example/recover/tok?x=1&y=2", false);

    expect(invite.subject).toBe("누리디에스엠에 초대했어요");
    expect(invite.html).toContain("비밀번호를 만들면 바로 시작할 수 있어요.");
    expect(invite.html).toContain("이 링크는 7일 동안 유효해요.");
    expect(invite.fallback).toBe("invite: https://nuri.example/invite/tok?x=1&y=2");

    expect(recovery.subject).toBe("비밀번호를 다시 만들어요");
    expect(recovery.html).toContain("새 비밀번호를 만들면 바로 들어와요.");
    expect(recovery.html).toContain("이 링크는 30분 동안 유효해요.");
    expect(recovery.fallback).toBe("recovery: https://nuri.example/recover/tok?x=1&y=2");

    for (const mail of [invite, recovery]) {
      expect(mail.html).toContain("#007aff");
      expect(mail.html).toContain("시작하기");
      expect(mail.html).toContain("누리디에스엠");
      expect(mail.html).toMatch(/font-family:-apple-system/);
      expect(mail.html).not.toMatch(/style="[^"]*"[A-Za-z]/);
    }

    expect(invite.html).toContain('href="https://nuri.example/invite/tok?x=1&amp;y=2"');
    expect(recovery.html).toContain('href="https://nuri.example/recover/tok?x=1&amp;y=2"');
  });

  it("uses totp copy when the app requires a code", () => {
    const invite = inviteMail("https://nuri.example/invite/tok", true);
    const recovery = recoveryMail("https://nuri.example/recover/tok", true);
    expect(invite.html).toContain("인증 앱을 등록하면 바로 시작할 수 있어요.");
    expect(recovery.subject).toBe("인증 앱을 다시 등록해요");
    expect(recovery.html).toContain("새 QR로 인증 앱을 연결하면 바로 들어와요.");
  });
});
