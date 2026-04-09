import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import JwtUserDto from "./dtos/jwt-user.dto";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const JwtPayload = createParamDecorator(
  (data: keyof JwtUserDto | undefined, ctx: ExecutionContext): JwtUserDto => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user[data] : req.user;
  },
);
