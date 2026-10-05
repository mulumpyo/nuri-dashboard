import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiParam, ApiProperty, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { AuthSessionService } from "../auth/auth.session-service";
import { CurrentUser } from "../auth/current-user";
import type { AccessClaims } from "../auth/auth.types";
import { DeviceRowDto, PairIssuedDto, PairReadyDto, StatusOkDto } from "../common/models";
import { ApiErrors, ApiIdParam, ApiOk, ApiTalk } from "../common/openapi";
import { DevicesService } from "./devices.service";

class PairCodeDto {
  @ApiProperty({ example: "123456", description: "TV에 보이는 6자리 코드예요" })
  @Transform(({ value }) => String(value ?? "").replace(/\D/g, "").slice(0, 6))
  @IsString()
  @Length(6, 6)
  code: string;
}

@ApiTags("devices")
@ApiErrors()
@Controller("devices")
export class DevicesController {
  constructor(
    private readonly devices: DevicesService,
    private readonly auth: AuthSessionService,
  ) {}

  @Post("code")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiTalk("devices_code", "화면 코드 받기", "TV에 보여줄 6자리 코드를 만들어요.")
  @ApiOk(PairIssuedDto)
  code() {
    return this.devices.requestCode();
  }

  @Get("code/:code")
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  @ApiTalk("devices_status", "화면 코드 상태", "아직 기다리는지, 승인됐는지 알려 드려요.")
  @ApiParam({ name: "code", example: "123456", description: "TV에 보이는 6자리 코드예요" })
  @ApiOk()
  status(@Param("code") code: string) {
    return this.devices.status(code);
  }

  @Post("claim")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiTalk("devices_claim", "화면 연결 받기", "승인된 코드로 디스플레이 쿠키를 내려 드려요.")
  @ApiOk(PairReadyDto)
  claim(@Body() body: PairCodeDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.devices.claim(body.code, res, this.auth.clientSite(req).origin);
  }

  @Post("approve")
  @UseGuards(AuthGuard)
  @ApiCookieAuth("access")
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiTalk("devices_approve", "화면 연결하기", "설정에서 6자리 코드를 넣어 TV를 연결해요.")
  @ApiOk(PairReadyDto)
  approve(@Body() body: PairCodeDto, @CurrentUser() user: AccessClaims) {
    return this.devices.approve(body.code, user.sub);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiCookieAuth("access")
  @ApiTalk("devices_list", "연결된 화면", "지금 붙어 있는 디스플레이와 고유값을 보여 드려요.")
  @ApiOk(DeviceRowDto, true)
  list() {
    return this.devices.list();
  }

  @Post(":id/revoke")
  @UseGuards(AuthGuard)
  @ApiCookieAuth("access")
  @ApiTalk("devices_revoke", "화면 끊기", "연결을 끊어요. TV는 바로 코드 화면으로 돌아가요.")
  @ApiIdParam()
  @ApiOk(StatusOkDto)
  revoke(@Param("id") id: string) {
    return this.devices.revoke(id);
  }
}
