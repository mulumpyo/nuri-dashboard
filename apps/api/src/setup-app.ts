import { INestApplication, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import cookieParser from "cookie-parser";
import { randomUUID } from "node:crypto";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { docsEnabled } from "./config/env";
import { applySecurityHeaders } from "./config/security-headers";

export const setupApp = (app: INestApplication) => {
  const express = app.getHttpAdapter().getInstance() as {
    set?: (key: string, value: unknown) => void;
    disable?: (key: string) => void;
    use: (...args: unknown[]) => void;
  };
  express.set?.("trust proxy", 1);
  express.disable?.("x-powered-by");
  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    applySecurityHeaders(res);
    next();
  });
  app.use((req: { headers: Record<string, string | undefined>; method?: string; originalUrl?: string; url?: string; user?: { kind?: string; role?: string } }, res: { setHeader: (k: string, v: string) => void; statusCode?: number; on: (event: string, fn: () => void) => void }, next: () => void) => {
    const id = req.headers["x-request-id"] || randomUUID();
    req.headers["x-request-id"] = id;
    res.setHeader("x-request-id", id);
    const path = req.originalUrl ?? req.url ?? "";
    if (!path.startsWith("/api/events")) {
      const started = Date.now();
      res.on("finish", () => {
        console.log(JSON.stringify({
          requestId: id,
          method: req.method,
          path,
          status: res.statusCode,
          ms: Date.now() - started,
          actor: req.user?.role ?? req.user?.kind ?? "anon",
        }));
      });
    }
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle("누리디에스엠 API")
    .setDescription(
      "발송 보드와 화면 연결을 위한 API예요. access 쿠키로 들어오고, 에러는 code와 한글 message로 알려 드려요.",
    )
    .setVersion("1.0")
    .addCookieAuth("access")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  if (docsEnabled()) {
    SwaggerModule.setup("docs-json", app, document);
    app.use("/api/docs", apiReference({ content: document }));
  }
  return document;
};
