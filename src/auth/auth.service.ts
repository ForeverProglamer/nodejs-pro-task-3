import { Injectable } from "@nestjs/common";
import LogInDto from "./log-in.dto";
import SignUpDto from "./sign-up.dto";
import { UsersService } from "src/users/users.service";
import { EntityNotFoundError, IncorrectPasswordError } from "src/common/errors";
import User from "src/users/user.entity";
import { verifyPassword, hashPassword } from "./utils";

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async login(logInDto: LogInDto) {
    const user = await this.usersService.findByEmail(logInDto.username);
    if (!user) throw new EntityNotFoundError(User.name, { ...logInDto });
    if (!(await verifyPassword(user.password, logInDto.password)))
      throw new IncorrectPasswordError({ ...logInDto });
    return {
      accessToken: "abc",
      refreshToken: "def",
      tokenType: "Bearer",
      expiresIn: 3600,
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
