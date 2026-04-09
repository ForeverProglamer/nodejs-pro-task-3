import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import JwtPayloadDto from "./dtos/jwt-payload.dto";

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

  validate(payload: JwtPayload): JwtPayloadDto {
    return { sub: payload.sub, email: payload.username } as JwtPayloadDto;
  }
}
