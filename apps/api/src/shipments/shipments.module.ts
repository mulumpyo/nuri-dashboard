import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CarriersModule } from "../carriers/carriers.module";
import { HolidaysModule } from "../holidays/holidays.module";
import { ShipmentsController } from "./shipments.controller";
import { ShipmentsRepository } from "./shipments.repository";
import { ShipmentsService } from "./shipments.service";

@Module({
  imports: [AuthModule, CarriersModule, HolidaysModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, ShipmentsRepository],
})
export class ShipmentsModule {}
