import { applyDecorators, type Type } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";

export const OPENAPI_OPS = [
  "health_live",
  "health_ready",
  "auth_invite",
  "auth_invite_status",
  "auth_register",
  "auth_register_verify",
  "auth_security",
  "auth_security_update",
  "auth_login",
  "auth_login_verify",
  "auth_refresh",
  "auth_logout",
  "auth_recovery_status",
  "auth_recovery",
  "auth_recovery_start",
  "auth_activity",
  "auth_me",
  "auth_users",
  "auth_users_delete",
  "holidays_list",
  "holidays_status",
  "holidays_create",
  "holidays_sync",
  "holidays_delete",
  "devices_code",
  "devices_status",
  "devices_claim",
  "devices_approve",
  "devices_list",
  "devices_revoke",
  "shipments_board",
  "shipments_companies",
  "shipments_create",
  "shipments_patch",
  "shipments_delete",
  "companies_list",
  "companies_create",
  "companies_bulk_delete",
  "companies_update",
  "companies_delete",
  "events_stream",
  "carriers_list",
  "carriers_create",
  "carriers_update",
  "carriers_delete",
] as const;

export const ApiErrors = () =>
  applyDecorators(
    ApiResponse({ status: 400, description: "요청 값이 맞지 않아요" }),
    ApiResponse({ status: 401, description: "로그인이 필요해요" }),
    ApiResponse({ status: 403, description: "권한이 없어요" }),
    ApiResponse({ status: 404, description: "찾을 수 없어요" }),
    ApiResponse({ status: 409, description: "이미 있는 값이에요" }),
    ApiResponse({ status: 429, description: "같은 요청을 너무 자주 보냈어요" }),
    ApiResponse({ status: 502, description: "메일이나 특일정보 같은 바깥 서비스를 못 받았어요" }),
  );

export const ApiOk = (type?: Type<unknown>, isArray = false) =>
  ApiOkResponse({
    description: "처리했어요",
    ...(type ? { type, isArray } : {}),
  });

export const ApiTalk = (operationId: string, summary: string, description: string) =>
  ApiOperation({ operationId, summary, description });

export const ApiIdParam = (name = "id", example = "3f1c0a8e-2d4b-4f1a-9c2e-7b6d5a4c3e21") =>
  ApiParam({ name, format: "uuid", example, description: "대상 아이디예요" });

export const ApiDateParam = (name = "date") =>
  ApiParam({ name, example: "2026-10-03", description: "날짜예요. YYYY-MM-DD로 보내 주세요" });

export const ApiFromQuery = () =>
  ApiQuery({
    name: "from",
    required: false,
    example: "2026-09-23",
    description: "이 날짜부터 영업일을 보여 줘요. 비우면 오늘부터예요",
  });

export const ApiSearchQuery = () =>
  ApiQuery({ name: "q", required: false, example: "한빛", description: "이름 일부로 찾아요" });

export const ApiPageQuery = () =>
  ApiQuery({
    name: "page",
    required: false,
    type: Number,
    example: 1,
    description: "몇 번째 페이지인지예요. 1부터예요",
  });

export const ApiLimitQuery = () =>
  ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    example: 20,
    description: "한 페이지에 몇 칸을 넣을지예요. 최대 50개예요",
  });

export const ApiTokenParam = (name = "token") =>
  ApiParam({ name, description: "메일 속 링크에 들어 있는 토큰이에요" });
