import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { HolidaysController } from "./holidays.controller";
import { HolidaysRepository } from "./holidays.repository";
import { HolidaysService } from "./holidays.service";

@Module({
  imports: [AuthModule],
  controllers: [HolidaysController],
  providers: [HolidaysService, HolidaysRepository],
  exports: [HolidaysService],
})
export class HolidaysModule {}
