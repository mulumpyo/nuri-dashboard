import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { forbidden, unauthorized } from "../common/errors";
import { AuthRepository } from "./auth.repository";
import { AccessClaims } from "./auth.types";

export const ALLOW_DEVICE = "allowDevice";
export const AllowDevice = () => SetMetadata(ALLOW_DEVICE, true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly tokens: AuthRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.cookies?.access as string | undefined;
    if (!token) throw unauthorized();
    try {
      const user = this.jwt.verify<AccessClaims>(token);
      if (user.jti && (await this.tokens.isDenied(user.jti))) {
        throw unauthorized("TOKEN_REVOKED", "이미 로그아웃된 세션이에요");
      }
      if (user.kind === "device" && user.deviceId && (await this.tokens.isRevoked(user.deviceId))) {
        throw unauthorized("DEVICE_REVOKED", "화면 연결이 끊겼어요");
      }
      if (user.kind === "admin" && (await this.tokens.isUserRevoked(user.sub))) {
        throw unauthorized("USER_REVOKED", "계정이 삭제됐어요");
      }
      const allowDevice = this.reflector.getAllAndOverride<boolean>(ALLOW_DEVICE, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (user.kind === "device" && !allowDevice) {
        throw forbidden("ADMIN_REQUIRED", "관리자만 할 수 있어요");
      }
      req.user = user;
      return true;
    } catch (err) {
      if (err && typeof err === "object" && "getStatus" in err) throw err;
      throw unauthorized("TOKEN_EXPIRED", "로그인이 만료됐어요");
    }
  }
}
