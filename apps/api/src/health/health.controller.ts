import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { StatusOkDto } from "../common/models";
import { ApiOk, ApiTalk } from "../common/openapi";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiTalk("health_live", "살아 있는지", "서버 프로세스가 켜져 있는지만 봐요.")
  @ApiOk(StatusOkDto)
  live() {
    return this.health.live();
  }

  @Get("ready")
  @ApiTalk("health_ready", "준비됐는지", "DB와 Redis에 붙을 수 있는지 봐요.")
  @ApiOk(StatusOkDto)
  ready() {
    return this.health.ready();
  }
}
