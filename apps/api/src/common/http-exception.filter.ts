import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const requestId = (host.switchToHttp().getRequest().headers["x-request-id"] as string) ?? "";

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const raw =
        typeof body === "object" && body
          ? (body as { message?: unknown; code?: string })
          : { message: String(body) };
      const message = Array.isArray(raw.message) ? raw.message.join(", ") : raw.message;
      res.status(exception.getStatus()).json({ code: raw.code ?? "HTTP_ERROR", message, requestId });
      return;
    }

    console.error(exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: "INTERNAL",
      message: "잠시 문제가 생겼어요",
      requestId,
    });
  }
}
