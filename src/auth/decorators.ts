import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from "@nestjs/common";
import JwtPayloadDto from "./dtos/jwt-payload.dto";
import { UserRoleValue } from "src/users/user.entity";

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

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRoleValue[]) =>
  SetMetadata(ROLES_KEY, roles);
