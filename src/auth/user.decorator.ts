import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import JwtUserDto from "./dtos/jwt-user.dto";

export const User = createParamDecorator(
  (data: keyof JwtUserDto | undefined, ctx: ExecutionContext): JwtUserDto => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user[data] : req.user;
  },
);
