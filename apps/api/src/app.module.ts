import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { CarriersModule } from "./carriers/carriers.module";
import { CompaniesModule } from "./companies/companies.module";
import { jwtSecret, validateEnv } from "./config/env";
import { DbModule } from "./db/db.module";
import { DevicesModule } from "./devices/devices.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health/health.controller";
import { HealthService } from "./health/health.service";
import { HolidaysModule } from "./holidays/holidays.module";
import { MailModule } from "./mail/mail.module";
import { RedisModule } from "./redis/redis.module";
import { ShipmentsModule } from "./shipments/shipments.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"], validate: validateEnv }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({ secret: jwtSecret() }),
    }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 60 }] }),
    DbModule,
    RedisModule,
    MailModule,
    AuthModule,
    EventsModule,
    CarriersModule,
    CompaniesModule,
    HolidaysModule,
    ShipmentsModule,
    DevicesModule,
  ],
  controllers: [HealthController],
  providers: [HealthService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
