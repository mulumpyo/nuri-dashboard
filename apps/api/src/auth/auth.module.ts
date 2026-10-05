import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ActivityInterceptor, ActivityService } from "../common/activity";
import { AuthAccountsService } from "./auth.accounts";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthLoginService } from "./auth.login";
import { AuthRepository } from "./auth.repository";
import { AuthSessionService } from "./auth.session-service";
import { SettingsRepository } from "./settings.repository";
import { UserRepository } from "./user.repository";

@Global()
@Module({
  controllers: [AuthController],
  providers: [
    AuthSessionService,
    AuthAccountsService,
    AuthLoginService,
    AuthRepository,
    UserRepository,
    SettingsRepository,
    AuthGuard,
    ActivityService,
    { provide: APP_INTERCEPTOR, useClass: ActivityInterceptor },
  ],
  exports: [AuthSessionService, AuthAccountsService, AuthGuard, AuthRepository, UserRepository, ActivityService],
})
export class AuthModule {}
