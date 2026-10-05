import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Matches, Min, MinLength } from "class-validator";
import { AllowDevice, AuthGuard } from "../auth/auth.guard";
import { BoardResponseDto, NamedRowDto, ShipmentRowDto, StatusOkDto } from "../common/models";
import { ApiErrors, ApiFromQuery, ApiIdParam, ApiOk, ApiSearchQuery, ApiTalk } from "../common/openapi";
import { PAY_TYPES, type PayType } from "../domain/pay-type";
import { ShipmentsService } from "./shipments.service";

class CreateShipmentDto {
  @ApiProperty({ example: "한빛상사", required: false, description: "업체 이름이에요. 없으면 아이디로 찾아요" })
  @IsOptional()
  @IsString()
  @MinLength(1)
  companyName?: string;

  @ApiProperty({ required: false, description: "이미 있는 업체 아이디예요" })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiProperty({ description: "보낼 택배사 아이디예요" })
  @IsString()
  carrierId: string;

  @ApiProperty({ example: "2026-09-23", description: "보내는 날이에요. YYYY-MM-DD예요" })
  @IsDateString()
  shipDate: string;

  @ApiProperty({ example: 2, description: "상자 수예요" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  boxCount: number;

  @ApiProperty({ enum: PAY_TYPES, example: "prepaid", required: false, description: "선불이면 prepaid, 착불이면 collect예요" })
  @IsOptional()
  @IsIn(PAY_TYPES)
  payType?: PayType;

  @ApiProperty({ example: "14:30", required: false, description: "퀵이면 출발 시각이에요" })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  shipTime?: string;
}

class PatchShipmentDto {
  @ApiProperty({ example: 3, required: false, description: "바꿀 상자 수예요" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  boxCount?: number;

  @ApiProperty({ enum: PAY_TYPES, example: "collect", required: false, description: "결제 구분을 바꿔요" })
  @IsOptional()
  @IsIn(PAY_TYPES)
  payType?: PayType;

  @ApiProperty({ example: "16:00", required: false, description: "퀵 출발 시각을 바꿔요" })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  shipTime?: string;
}

@ApiTags("shipments")
@ApiCookieAuth("access")
@ApiErrors()
@UseGuards(AuthGuard)
@Controller("shipments")
export class ShipmentsController {
  constructor(private readonly shipments: ShipmentsService) {}

  @Get("board")
  @AllowDevice()
  @ApiTalk("shipments_board", "오늘 보낼 목록", "영업일 기준으로 날짜별 발송을 보여 드려요. 화면 기기도 볼 수 있어요.")
  @ApiFromQuery()
  @ApiOk(BoardResponseDto)
  board(@Query("from") from?: string) {
    return this.shipments.board(from);
  }

  @Get("companies")
  @ApiTalk("shipments_companies", "발송용 업체 찾기", "홈에서 업체를 고를 때 이름을 찾아요.")
  @ApiSearchQuery()
  @ApiOk(NamedRowDto, true)
  companies(@Query("q") q = "") {
    return this.shipments.searchCompanies(q);
  }

  @Post()
  @ApiTalk("shipments_create", "발송 넣기", "같은 날·업체·택배사·결제 구분이면 수량을 더해요. 없으면 새로 만들어요.")
  @ApiOk(ShipmentRowDto)
  create(@Body() body: CreateShipmentDto) {
    return this.shipments.add(body);
  }

  @Patch(":id")
  @ApiTalk("shipments_patch", "발송 고치기", "수량, 결제 구분, 출발 시간을 바꿔요.")
  @ApiIdParam()
  @ApiOk(ShipmentRowDto)
  patch(@Param("id") id: string, @Body() body: PatchShipmentDto) {
    return this.shipments.patch(id, body);
  }

  @Delete(":id")
  @ApiTalk("shipments_delete", "발송 빼기", "그 날 목록에서 해당 업체를 빼요.")
  @ApiIdParam()
  @ApiOk(StatusOkDto)
  remove(@Param("id") id: string) {
    return this.shipments.remove(id);
  }
}
