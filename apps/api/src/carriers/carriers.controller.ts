import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { CarrierRowDto, StatusOkDto } from "../common/models";
import { ApiErrors, ApiIdParam, ApiOk, ApiTalk } from "../common/openapi";
import { CarriersService } from "./carriers.service";

class CarrierDto {
  @ApiProperty({ example: "대한통운", description: "택배사 이름이에요" })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ required: false, example: 1, description: "목록에서 보여줄 순서예요" })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class CarrierPatchDto {
  @ApiProperty({ required: false, description: "바꿀 택배사 이름이에요" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, description: "바꿀 순서예요" })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiProperty({ required: false, description: "false면 홈 보드에서 숨겨요" })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

@ApiTags("carriers")
@ApiCookieAuth("access")
@ApiErrors()
@UseGuards(AuthGuard)
@Controller("carriers")
export class CarriersController {
  constructor(private readonly carriers: CarriersService) {}

  @Get()
  @ApiTalk("carriers_list", "택배사 목록", "등록된 택배사를 보여 드려요.")
  @ApiOk(CarrierRowDto, true)
  list() {
    return this.carriers.list();
  }

  @Post()
  @ApiTalk("carriers_create", "택배사 등록", "새 택배사를 넣어요.")
  @ApiOk(CarrierRowDto)
  create(@Body() body: CarrierDto) {
    return this.carriers.create(body);
  }

  @Patch(":id")
  @ApiTalk("carriers_update", "택배사 수정", "이름이나 숨김을 바꿔요.")
  @ApiIdParam()
  @ApiOk(CarrierRowDto)
  update(@Param("id") id: string, @Body() body: CarrierPatchDto) {
    return this.carriers.update(id, body);
  }

  @Delete(":id")
  @ApiTalk("carriers_delete", "택배사 삭제", "택배사를 지워요. 관련 발송도 함께 사라져요.")
  @ApiIdParam()
  @ApiOk(StatusOkDto)
  remove(@Param("id") id: string) {
    return this.carriers.remove(id);
  }
}
