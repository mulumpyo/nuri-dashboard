import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AccessClaims } from "./auth.types";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AccessClaims => {
  return ctx.switchToHttp().getRequest().user as AccessClaims;
});
