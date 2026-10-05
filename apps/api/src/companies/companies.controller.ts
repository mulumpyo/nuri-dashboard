import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiProperty, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from "class-validator";
import { AuthGuard } from "../auth/auth.guard";
import { BulkDeletedDto, CompanyPageDto, NamedRowDto, StatusOkDto } from "../common/models";
import { ApiErrors, ApiIdParam, ApiLimitQuery, ApiOk, ApiPageQuery, ApiSearchQuery, ApiTalk } from "../common/openapi";
import { CompaniesService } from "./companies.service";

class CompanyDto {
  @ApiProperty({ example: "한빛상사", description: "업체 이름이에요" })
  @IsString()
  @MinLength(1)
  name: string;
}

class BulkDeleteDto {
  @ApiProperty({ type: [String], description: "지울 업체 아이디예요" })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  ids: string[];
}

class CompanyQueryDto {
  @ApiProperty({ required: false, description: "이름 일부로 찾아요" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, description: "몇 번째 페이지인지예요. 1부터예요" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, description: "한 페이지에 몇 칸을 넣을지예요. 최대 50개예요" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

@ApiTags("companies")
@ApiCookieAuth("access")
@ApiErrors()
@UseGuards(AuthGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  @ApiTalk("companies_list", "업체 목록", "지금 페이지에 보여줄 업체만 가져와요. q로 이름을 찾고, page·limit으로 칸 수를 맞춰요.")
  @ApiSearchQuery()
  @ApiPageQuery()
  @ApiLimitQuery()
  @ApiOk(CompanyPageDto)
  list(@Query() query: CompanyQueryDto) {
    return this.companies.list(query.q ?? "", query.page ?? 1, query.limit ?? 20);
  }

  @Post()
  @ApiTalk("companies_create", "업체 등록", "새 업체를 넣어요. 같은 이름은 쓸 수 없어요.")
  @ApiOk(NamedRowDto)
  create(@Body() body: CompanyDto) {
    return this.companies.create(body.name);
  }

  @Post("bulk-delete")
  @ApiTalk("companies_bulk_delete", "업체 여러 곳 삭제", "고른 업체를 한 번에 지워요. 관련 발송도 함께 사라져요.")
  @ApiOk(BulkDeletedDto)
  removeMany(@Body() body: BulkDeleteDto) {
    return this.companies.removeMany(body.ids);
  }

  @Patch(":id")
  @ApiTalk("companies_update", "업체 이름 수정", "업체 이름을 바꿔요. 홈 보드에도 바로 반영돼요.")
  @ApiIdParam()
  @ApiOk(NamedRowDto)
  update(@Param("id") id: string, @Body() body: CompanyDto) {
    return this.companies.update(id, body.name);
  }

  @Delete(":id")
  @ApiTalk("companies_delete", "업체 삭제", "한 곳을 지워요. 관련 발송도 함께 사라져요.")
  @ApiIdParam()
  @ApiOk(StatusOkDto)
  remove(@Param("id") id: string) {
    return this.companies.remove(id);
  }
}
