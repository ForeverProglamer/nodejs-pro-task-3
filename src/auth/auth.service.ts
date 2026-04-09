import { Injectable } from "@nestjs/common";
import LogInDto from "./dtos/log-in.dto";
import SignUpDto from "./dtos/sign-up.dto";
import { UsersService } from "src/users/users.service";
import { EntityNotFoundError, IncorrectPasswordError } from "src/common/errors";
import User from "src/users/user.entity";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  ACCESS_TOKEN_MAX_AGE_S,
  REFRESH_TOKEN_MAX_AGE_S,
} from "./jwt-constants";
import JwtUser from "./jwt-user";
import { PasswordService } from "./password.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private passwordService: PasswordService,
    private configService: ConfigService,
  ) {}

  async login(logInDto: LogInDto) {
    const user = await this.usersService.findByEmail(logInDto.username);
    if (!user) throw new EntityNotFoundError(User.name, { ...logInDto });
    if (!(await this.passwordService.verify(user.password, logInDto.password)))
      throw new IncorrectPasswordError({ ...logInDto });
    return this.prepareTokenResponse(user);
  }

  async signUp(signUpDto: SignUpDto) {
    const hashedPassword = await this.passwordService.hash(signUpDto.password);
    return await this.usersService.create(signUpDto, hashedPassword);
  }

  async refreshAccessToken(user: JwtUser, refreshToken: string) {
    const currentUser = await this.usersService.findById(user.sub);
    if (!currentUser)
      throw new EntityNotFoundError(User.name, { ...user, refreshToken });
    return this.prepareTokenResponse(currentUser);
  }

  private prepareTokenResponse(user: User) {
    const payload = { username: user.email, sub: user.id };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get("JWT_RT_SECRET"),
        expiresIn: REFRESH_TOKEN_MAX_AGE_S,
      }),
      tokenType: "Bearer",
      expiresIn: ACCESS_TOKEN_MAX_AGE_S,
    };
  }
}
