import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Resend } from "resend";
import { badGateway } from "../common/errors";
import { isProduction } from "../config/env";

export type OutboundMail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  fallback: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
};

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  configured(): boolean {
    return Boolean(this.smtp() || this.resendKey());
  }

  async send(mail: OutboundMail): Promise<boolean> {
    if (this.inTest()) return false;
    const smtp = this.smtp();
    if (smtp) {
      try {
        await this.sendSmtp(smtp, mail);
        return true;
      } catch (err) {
        console.error("smtp send failed", err);
        throw badGateway("MAIL_FAILED", "메일을 보내지 못했어요. SMTP 설정을 확인해 주세요");
      }
    }
    const key = this.resendKey();
    if (key) {
      try {
        await new Resend(key).emails.send({
          from: this.config.get<string>("SMTP_FROM")?.trim() || "누리디에스엠 <noreply@mulumpyo.com>",
          to: mail.to,
          subject: mail.subject,
          html: mail.html,
        });
        return true;
      } catch (err) {
        console.error("resend send failed");
        if (isProduction()) throw badGateway("MAIL_FAILED", "메일을 보내지 못했어요. 메일 설정을 확인해 주세요");
        return false;
      }
    }
    if (!isProduction()) console.log(mail.fallback);
    return false;
  }

  private inTest(): boolean {
    return Boolean(process.env.JEST_WORKER_ID) && process.env.MAIL_TEST !== "1";
  }

  private resendKey(): string | undefined {
    return this.config.get<string>("RESEND_API_KEY")?.trim() || undefined;
  }

  private smtp(): SmtpConfig | undefined {
    const host = this.config.get<string>("SMTP_HOST")?.trim();
    if (!host) return undefined;
    const port = Number(this.config.get("SMTP_PORT") ?? 587) || 587;
    const secure = this.config.get("SMTP_SECURE") === "true" || port === 465;
    const user = this.config.get<string>("SMTP_USER")?.trim() || undefined;
    const pass = this.config.get<string>("SMTP_PASS") || undefined;
    const from =
      this.config.get<string>("SMTP_FROM")?.trim() || (user ? `누리디에스엠 <${user}>` : "누리디에스엠 <noreply@localhost>");
    return { host, port, secure, user, pass, from };
  }

  private async sendSmtp(smtp: SmtpConfig, mail: OutboundMail): Promise<void> {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      requireTLS: !smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass ?? "" } : undefined,
    });
    try {
      await transport.sendMail({
        from: smtp.from,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text ?? mail.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      });
    } finally {
      transport.close();
    }
  }
}
