import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import JwtUser from "./jwt-user";

export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
  // Custom fields
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow("JWT_AT_SECRET"),
    });

    this.configService = configService;
  }

  validate(payload: JwtPayload): JwtUser {
    return { sub: payload.sub, email: payload.username } as JwtUser;
  }
}
