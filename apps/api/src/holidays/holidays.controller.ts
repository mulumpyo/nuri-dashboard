import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsDateString, IsString, MinLength } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { HolidayRowDto, HolidaySyncDto, StatusOkDto } from "../common/models";
import { ApiDateParam, ApiErrors, ApiOk, ApiTalk } from "../common/openapi";
import { HolidaysService } from "./holidays.service";

class HolidayDto {
  @ApiProperty({ example: "2026-10-03", description: "쉬는 날 날짜예요. YYYY-MM-DD예요" })
  @IsDateString()
  date: string;

  @ApiProperty({ example: "개천절", description: "화면에 보여줄 이름이에요" })
  @IsString()
  @MinLength(1)
  name: string;
}

@ApiTags("holidays")
@ApiCookieAuth("access")
@ApiErrors()
@UseGuards(AuthGuard)
@Controller("holidays")
export class HolidaysController {
  constructor(private readonly holidays: HolidaysService) {}

  @Get()
  @ApiTalk("holidays_list", "쉬는 날 목록", "국가 공휴일과 직접 넣은 날을 모두 보여 드려요.")
  @ApiOk(HolidayRowDto, true)
  list() {
    return this.holidays.list();
  }

  @Get("status")
  @ApiTalk("holidays_status", "불러오기 상태", "특일정보를 언제, 몇 개 가져왔는지 알려 드려요. 키가 없으면 실패로 보여요.")
  @ApiOk(HolidaySyncDto)
  status() {
    return this.holidays.status();
  }

  @Post()
  @ApiTalk("holidays_create", "쉬는 날 추가", "달력에 없는 휴일을 직접 넣어요.")
  @ApiOk(HolidayRowDto)
  create(@Body() body: HolidayDto) {
    return this.holidays.addManual(body.date, body.name);
  }

  @Post("sync")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiTalk("holidays_sync", "국가 공휴일 불러오기", "공공 특일정보의 공휴일 조회에서 올해와 내년 쉬는 날을 가져와요. DATA_GO_KR_SERVICE_KEY가 필요해요. 직접 넣은 날은 덮지 않아요.")
  @ApiOk(HolidaySyncDto)
  sync() {
    return this.holidays.sync();
  }

  @Delete(":date")
  @ApiTalk("holidays_delete", "쉬는 날 삭제", "그 날짜를 달력에서 빼요.")
  @ApiDateParam()
  @ApiOk(StatusOkDto)
  remove(@Param("date") date: string) {
    return this.holidays.remove(date);
  }
}
