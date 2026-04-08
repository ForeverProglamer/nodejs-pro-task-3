import {
  ExecutionContext,
  Injectable,
  CanActivate,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";
import { IS_PUBLIC_KEY } from "./public.decorator";

import { Request } from "express";
import { REFRESH_TOKEN_COOKIE } from "./jwt-constants";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { formatError } from "src/common/utils";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic ? true : super.canActivate(context);
  }
}

@Injectable()
export class JwtCookieAuthGuard implements CanActivate {
  private readonly logger: Logger = new Logger(JwtCookieAuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get("JWT_RT_SECRET"),
        ignoreExpiration: false,
      });
      req["user"] = payload;
    } catch (e) {
      this.logger.warn(`JWT verification failed due to: ${formatError(e)}`);
      throw new UnauthorizedException();
    }
    return true;
  }
}
