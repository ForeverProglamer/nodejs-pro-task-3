import { Injectable } from "@nestjs/common";
import LogInDto from "./dtos/log-in.dto";
import SignUpDto from "./dtos/sign-up.dto";
import { UsersService } from "src/users/users.service";
import { EntityNotFoundError, IncorrectPasswordError } from "src/common/errors";
import User from "src/users/user.entity";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import JwtPayloadDto from "./dtos/jwt-payload.dto";
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

  async refreshAccessToken(payload: JwtPayloadDto, refreshToken: string) {
    const user = await this.usersService.findById(payload.sub);
    if (!user)
      throw new EntityNotFoundError(User.name, { ...payload, refreshToken });
    return this.prepareTokenResponse(user);
  }

  private prepareTokenResponse(user: User) {
    const payload = { username: user.email, sub: user.id, roles: [user.role] };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.getOrThrow("JWT_RT_SECRET"),
        expiresIn: Number(this.configService.getOrThrow("JWT_RT_MAX_AGE_S")),
      }),
      tokenType: "Bearer",
      expiresIn: Number(this.configService.getOrThrow("JWT_AT_MAX_AGE_S")),
    };
  }
}
