const FACE = "-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif";

const type = (size: number, weight: number, line: number) =>
  `font-family:${FACE};font-size:${size}px;font-weight:${weight};line-height:${line};`;

const escapeAttr = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

type MailCopy = {
  subject: string;
  title: string;
  lead: string;
  action: string;
  expiry: string;
  fallback: (link: string) => string;
};

const inviteCopy = (totpOn: boolean): MailCopy => ({
  subject: "누리디에스엠에 초대했어요",
  title: "누리디에스엠에 초대했어요",
  lead: totpOn ? "인증 앱을 등록하면 바로 시작할 수 있어요." : "비밀번호를 만들면 바로 시작할 수 있어요.",
  action: "시작하기",
  expiry: "이 링크는 7일 동안 유효해요.",
  fallback: (link) => `invite: ${link}`,
});

const recoveryCopy = (totpOn: boolean): MailCopy => ({
  subject: totpOn ? "인증 앱을 다시 등록해요" : "비밀번호를 다시 만들어요",
  title: totpOn ? "인증 앱을 다시 등록해요" : "비밀번호를 다시 만들어요",
  lead: totpOn ? "새 QR로 인증 앱을 연결하면 바로 들어와요." : "새 비밀번호를 만들면 바로 들어와요.",
  action: "시작하기",
  expiry: "이 링크는 30분 동안 유효해요.",
  fallback: (link) => `recovery: ${link}`,
});

const mailHtml = (link: string, copy: MailCopy) => {
  const href = escapeAttr(link);
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${copy.title}</title>
</head>
<body style="margin:0;padding:0;background:#f2f2f7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f2f7;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="420" cellpadding="0" cellspacing="0" style="max-width:420px;width:100%;background:#ffffff;border-radius:18px;">
        <tr>
          <td style="padding:40px 32px 36px;">
            <p style="margin:0 0 10px;color:#86868b;${type(13, 500, 1.3)}">누리디에스엠</p>
            <h1 style="margin:0 0 12px;color:#1d1d1f;${type(28, 700, 1.2)}">${copy.title}</h1>
            <p style="margin:0 0 28px;color:#6e6e73;${type(16, 400, 1.45)}">${copy.lead}</p>
            <a href="${href}" style="display:inline-block;background:#007aff;color:#ffffff;border-radius:980px;padding:12px 22px;text-decoration:none;${type(16, 600, 1.2)}">${copy.action}</a>
            <p style="margin:28px 0 0;color:#86868b;${type(13, 400, 1.4)}">${copy.expiry}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};

const mailText = (link: string, copy: MailCopy) =>
  `${copy.title}\n${copy.lead}\n${link}\n${copy.expiry}`;

const compose = (link: string, copy: MailCopy) => ({
  subject: copy.subject,
  html: mailHtml(link, copy),
  text: mailText(link, copy),
  fallback: copy.fallback(link),
});

export const inviteMail = (link: string, totpOn: boolean) => compose(link, inviteCopy(totpOn));

export const recoveryMail = (link: string, totpOn: boolean) => compose(link, recoveryCopy(totpOn));
