import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import JwtPayloadDto from "./dtos/jwt-payload.dto";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const JwtPayload = createParamDecorator(
  (
    data: keyof JwtPayloadDto | undefined,
    ctx: ExecutionContext,
  ): JwtPayloadDto => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user[data] : req.user;
  },
);
