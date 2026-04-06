import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import LogInDto from "./log-in.dto";
import SignUpDto from "./sign-up.dto";
import { Response } from "express";
import { Cookies } from "src/cookies/cookies.decorator";

const REFRESH_TOKEN_MAX_AGE_S = 3600 * 24 * 7;
const REFRESH_TOKEN_COOKIE = "refreshToken";

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

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

  @Post("sign-up")
  @HttpCode(HttpStatus.CREATED)
  signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post("refresh")
  refreshAccessToken(@Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string) {
    return this.authService.refreshAccessToken(refreshToken);
  }
}
