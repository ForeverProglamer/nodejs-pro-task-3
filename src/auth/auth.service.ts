import { Injectable } from "@nestjs/common";
import LogInDto from "./log-in.dto";
import SignUpDto from "./sign-up.dto";
import { UsersService } from "src/users/users.service";
import { EntityNotFoundError, IncorrectPasswordError } from "src/common/errors";
import User from "src/users/user.entity";
import { verifyPassword, hashPassword } from "./utils";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { addSeconds, getUnixTime } from "date-fns";
import {
  ACCESS_TOKEN_MAX_AGE_S,
  REFRESH_TOKEN_MAX_AGE_S,
} from "./jwt-constants";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(logInDto: LogInDto) {
    const user = await this.usersService.findByEmail(logInDto.username);
    if (!user) throw new EntityNotFoundError(User.name, { ...logInDto });
    if (!(await verifyPassword(user.password, logInDto.password)))
      throw new IncorrectPasswordError({ ...logInDto });

    const payload = { username: user.email, sub: user.id };

    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get("JWT_REFRESH_SECRET"),
        expiresIn: REFRESH_TOKEN_MAX_AGE_S,
      }),
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_MAX_AGE_S,
    };
  }

  async signUp(signUpDto: SignUpDto) {
    const hashedPassword = await hashPassword(signUpDto.password);
    return await this.usersService.create(signUpDto, hashedPassword);
  }

  refreshAccessToken(refreshToken: string) {
    return {
      accessToken: "abc",
      refreshToken: "def",
      tokenType: "Bearer",
      expiresIn: 3600,
    };
  }
}
