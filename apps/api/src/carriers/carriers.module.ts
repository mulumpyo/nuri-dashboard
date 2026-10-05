import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CarriersController } from "./carriers.controller";
import { CarriersRepository } from "./carriers.repository";
import { CarriersService } from "./carriers.service";

@Module({
  imports: [AuthModule],
  controllers: [CarriersController],
  providers: [CarriersService, CarriersRepository],
  exports: [CarriersService],
})
export class CarriersModule {}
