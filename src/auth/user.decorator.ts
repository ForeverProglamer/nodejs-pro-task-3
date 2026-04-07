import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import JwtUser from "./jwt-user";

export const User = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): JwtUser => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user[data] : req.user;
  },
);
