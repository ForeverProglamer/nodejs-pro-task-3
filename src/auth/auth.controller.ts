import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import LogInDto from "./log-in.dto";
import SignUpDto from "./sign-up.dto";
import { Response } from "express";
import { Cookies } from "src/cookies/cookies.decorator";
import { REFRESH_TOKEN_COOKIE, REFRESH_TOKEN_MAX_AGE_S } from "./jwt-constants";
import { Public } from "./public.decorator";
import { User } from "./user.decorator";
import JwtUser from "./jwt-user";
import { JwtCookieAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post("login")
  async login(
    @Body() logInDto: LogInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(logInDto);
    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: REFRESH_TOKEN_MAX_AGE_S * 1000,
    });
    return result;
  }

  @Public()
  @Post("sign-up")
  @HttpCode(HttpStatus.CREATED)
  async signUp(@Body() signUpDto: SignUpDto) {
    const user = await this.authService.signUp(signUpDto);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Public()
  @UseGuards(JwtCookieAuthGuard)
  @Post("refresh")
  refreshAccessToken(
    @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string,
    @User() user: JwtUser,
  ) {
    return this.authService.refreshAccessToken(user, refreshToken);
  }
}
