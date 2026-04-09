import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./decorators";
import { UserRoleValue } from "src/users/user.entity";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRoleValue[]>(
      ROLES_KEY,
      [context.getClass(), context.getHandler()],
    );
    if (!required) return true;
    const req = context.switchToHttp().getRequest();
    return required.some((role) => req.user?.roles?.includes(role));
  }
}
