import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiPropertyOptional, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import type { Request, Response } from "express";
import { AuthAccountsService } from "./auth.accounts";
import { AllowDevice, AuthGuard } from "./auth.guard";
import { AuthLoginService } from "./auth.login";
import { AuthSessionService } from "./auth.session-service";
import { CurrentUser } from "./current-user";
import { AcceptInviteDto, InviteDto, LoginDto, RecoveryDto, RefreshOkDto, TotpRequiredDto, TotpVerifyDto } from "./dto";
import type { AccessClaims } from "./auth.types";
import { ActivityService } from "../common/activity";
import { AccountRowDto, ActivityPageDto, InviteStatusDto, MeDto, RecoveryStatusDto, SecurityDto, StatusOkDto } from "../common/models";
import { ApiErrors, ApiIdParam, ApiLimitQuery, ApiOk, ApiPageQuery, ApiSearchQuery, ApiTalk, ApiTokenParam } from "../common/openapi";

class ActivityQueryDto {
  @ApiPropertyOptional({ enum: ["work", "login"], description: "작업만 볼지, 로그인만 볼지예요" })
  @IsOptional()
  @IsIn(["work", "login"])
  kind?: "work" | "login";

  @ApiPropertyOptional({ example: "한빛", description: "이름이나 이메일 일부로 찾아요" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 1, description: "몇 번째 페이지인지예요. 1부터예요" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, description: "한 페이지에 몇 줄을 넣을지예요" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

@ApiTags("auth")
@ApiErrors()
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthSessionService) private readonly session: AuthSessionService,
    @Inject(AuthAccountsService) private readonly accounts: AuthAccountsService,
    @Inject(AuthLoginService) private readonly login: AuthLoginService,
    private readonly activity: ActivityService,
  ) {}

  @Post("invites")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseGuards(AuthGuard)
  @ApiCookieAuth("access")
  @ApiTalk("auth_invite", "초대 메일 보내기", "초대 메일을 보내요. 받은 사람이 비밀번호를 만들면 들어올 수 있어요.")
  @ApiOk()
  async invite(@Body() body: InviteDto, @CurrentUser() user: AccessClaims, @Req() req: Request) {
    await this.accounts.requireUserManager(user);
    return this.login.invite(body.email, user.sub, this.session.clientSite(req));
  }

  @Get("invite/:token")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiTalk("auth_invite_status", "초대 링크 확인", "링크가 살아 있는지, 만료됐는지, 이미 썼는지 알려 드려요.")
  @ApiTokenParam()
  @ApiOk(InviteStatusDto)
  inviteStatus(@Param("token") token: string) {
    return this.login.inviteStatus(token);
  }

  @Post("register")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiTalk("auth_register", "초대 수락", "초대 링크로 비밀번호를 만들어요. 인증 앱이 켜져 있으면 TOTP도 이어서 받아요.")
  @ApiOk()
  registerOptions(
    @Body() body: AcceptInviteDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.login.startRegister(body.token, this.session.clientSite(req), res, body.password);
  }

  @Post("register/verify")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiTalk("auth_register_verify", "초대 인증 확인", "인증 앱 번호가 맞으면 로그인해 드려요.")
  @ApiOk(RefreshOkDto)
  registerVerify(@Body() body: TotpVerifyDto, @Res({ passthrough: true }) res: Response) {
    return this.login.finishRegister(body.challengeKey ?? "", body.code ?? "", res);
  }

  @Get("security")
  @ApiTalk("auth_security", "로그인 보안 보기", "지금 인증 앱을 쓰는지 알려 드려요.")
  @ApiOk(SecurityDto)
  security() {
    return this.accounts.security();
  }

  @Patch("security")
  @UseGuards(AuthGuard)
  @ApiCookieAuth("access")
  @ApiTalk("auth_security_update", "인증 앱 켜고 끄기", "다음 로그인부터 인증 앱을 쓸지 바꿔요. 관리자만 바꿀 수 있어요.")
  @ApiOk(SecurityDto)
  setSecurity(@Body() body: TotpRequiredDto, @CurrentUser() user: AccessClaims) {
    return this.accounts.setTotpRequired(user, body.totpRequired);
  }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiTalk("auth_login", "로그인 시작", "이메일로 다음 칸을 알려 드려요. 없는 이메일도 같은 비밀번호 칸을 보여 주고, 초대받지 않은 계정은 비밀번호를 만들 수 없어요.")
  @ApiOk()
  loginOptions(@Body() body: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.login.startLogin(body.email, this.session.clientSite(req), res);
  }

  @Post("login/verify")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiTalk("auth_login_verify", "로그인 확인", "비밀번호나 인증 번호를 확인한 뒤 쿠키를 내려 드려요.")
  @ApiOk(RefreshOkDto)
  loginVerify(@Body() body: TotpVerifyDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.login.finishLogin(body, res, this.session.clientSite(req));
  }

  @Post("refresh")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiTalk("auth_refresh", "로그인 유지", "refresh 쿠키로 access를 새로 내려 드려요.")
  @ApiOk(RefreshOkDto)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.session.refresh(req.cookies?.refresh as string | undefined, res, this.session.clientSite(req).origin);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiTalk("auth_logout", "로그아웃", "바로 나가게 해 드려요. 확인 없이 refresh 가족과 쿠키를 지워요.")
  @ApiOk(StatusOkDto)
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.session.logout(
      req.cookies?.refresh as string | undefined,
      req.cookies?.access as string | undefined,
      res,
      this.session.clientSite(req).origin,
    );
  }

  @Get("recovery/:token")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiTalk("auth_recovery_status", "비밀번호 링크 확인", "링크가 살아 있는지, 만료됐는지 알려 드려요.")
  @ApiTokenParam()
  @ApiOk(RecoveryStatusDto)
  recoveryStatus(@Param("token") token: string) {
    return this.login.recoveryStatus(token);
  }

  @Post("recovery")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiTalk("auth_recovery", "비밀번호 메일 보내기", "비밀번호를 다시 만드는 메일을 보내요. 없는 이메일이어도 같은 답을 드려요.")
  @ApiOk()
  recovery(@Body() body: RecoveryDto, @Req() req: Request) {
    return this.login.requestRecovery(body.email, this.session.clientSite(req));
  }

  @Post("recovery/start")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiTalk("auth_recovery_start", "비밀번호 다시 만들기", "메일 링크로 새 비밀번호를 만들어요.")
  @ApiOk()
  recoveryOptions(
    @Body() body: AcceptInviteDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.login.startRecoveryRegister(body.token, this.session.clientSite(req), res, body.password);
  }

  @Get("activity")
  @UseGuards(AuthGuard)
  @ApiCookieAuth("access")
  @ApiTalk("auth_activity", "로그 기록", "작업과 로그인 기록을 페이지로 보여 드려요. 지운 이름과 이메일도 함께 나와요. 소유자만 볼 수 있어요.")
  @ApiQuery({ name: "kind", required: false, enum: ["work", "login"], description: "작업만 볼지, 로그인만 볼지예요" })
  @ApiSearchQuery()
  @ApiPageQuery()
  @ApiLimitQuery()
  @ApiOk(ActivityPageDto)
  async activityLog(@Query() query: ActivityQueryDto, @CurrentUser() user: AccessClaims) {
    await this.accounts.requireUserManager(user);
    return this.activity.list(query);
  }

  @Get("me")
  @UseGuards(AuthGuard)
  @AllowDevice()
  @ApiCookieAuth("access")
  @ApiTalk("auth_me", "지금 나", "로그인한 사람과 권한을 알려 드려요. 화면 기기도 이 길로 들어와요.")
  @ApiOk(MeDto)
  me(@CurrentUser() user: AccessClaims) {
    return this.accounts.me(user);
  }

  @Get("users")
  @UseGuards(AuthGuard)
  @ApiCookieAuth("access")
  @ApiTalk("auth_users", "계정 목록", "초대된 계정을 보여 드려요. 초대받은 관리자는 볼 수 없어요.")
  @ApiOk(AccountRowDto, true)
  users(@CurrentUser() user: AccessClaims) {
    return this.accounts.listUsers(user);
  }

  @Delete("users/:id")
  @UseGuards(AuthGuard)
  @ApiCookieAuth("access")
  @ApiTalk("auth_users_delete", "계정 삭제", "초대한 계정을 지워요. 나와 최초 관리자 계정은 지울 수 없어요.")
  @ApiIdParam()
  @ApiOk(StatusOkDto)
  removeUser(@Param("id") id: string, @CurrentUser() user: AccessClaims) {
    return this.accounts.removeUser(user, id);
  }
}
