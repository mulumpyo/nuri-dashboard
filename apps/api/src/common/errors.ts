import { HttpException, HttpStatus } from "@nestjs/common";

export class ApiError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

export const badRequest = (code: string, message: string, details?: unknown) =>
  new ApiError(code, message, HttpStatus.BAD_REQUEST, details);

export const unauthorized = (code = "UNAUTHORIZED", message = "로그인이 필요해요") =>
  new ApiError(code, message, HttpStatus.UNAUTHORIZED);

export const forbidden = (code = "FORBIDDEN", message = "권한이 없어요") =>
  new ApiError(code, message, HttpStatus.FORBIDDEN);

export const notFound = (code: string, message: string) =>
  new ApiError(code, message, HttpStatus.NOT_FOUND);

export const conflict = (code: string, message: string) =>
  new ApiError(code, message, HttpStatus.CONFLICT);

export const badGateway = (code: string, message: string) =>
  new ApiError(code, message, HttpStatus.BAD_GATEWAY);
