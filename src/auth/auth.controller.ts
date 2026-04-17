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
import LogInDto from "./dtos/log-in.dto";
import SignUpDto from "./dtos/sign-up.dto";
import { Response } from "express";
import { Cookies } from "src/cookies/cookies.decorator";
import { JwtPayload, Public } from "./decorators";
import JwtPayloadDto from "./dtos/jwt-payload.dto";
import { JwtCookieAuthGuard, REFRESH_TOKEN_COOKIE } from "./jwt-auth.guard";
import { ConfigService } from "@nestjs/config";
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import TokenResponseDto from "./dtos/token-response.dto";
import UserResponseDto from "./dtos/user-response.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Log into system" })
  @ApiOkResponse({ type: TokenResponseDto })
  async login(
    @Body() logInDto: LogInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TokenResponseDto> {
    const result = await this.authService.login(logInDto);
    response.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: Number(this.configService.getOrThrow("JWT_RT_MAX_AGE_S")) * 1000,
    });
    return result;
  }

  @Public()
  @Post("sign-up")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create an account" })
  @ApiCreatedResponse({ type: UserResponseDto })
  async signUp(@Body() signUpDto: SignUpDto): Promise<UserResponseDto> {
    const user = await this.authService.signUp(signUpDto);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  @Public()
  @Post("refresh")
  @UseGuards(JwtCookieAuthGuard)
  @ApiOperation({ summary: "Refresh access token" })
  @ApiOkResponse({ type: TokenResponseDto })
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  refreshAccessToken(
    @Cookies(REFRESH_TOKEN_COOKIE) refreshToken: string,
    @JwtPayload() payload: JwtPayloadDto,
  ): Promise<TokenResponseDto> {
    return this.authService.refreshAccessToken(payload, refreshToken);
  }
}
