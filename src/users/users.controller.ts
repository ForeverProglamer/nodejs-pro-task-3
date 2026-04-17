import { Controller, Get, NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtPayload } from "src/auth/decorators";
import JwtPayloadDto from "src/auth/dtos/jwt-payload.dto";
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from "@nestjs/swagger";
import UserResponseDto from "src/auth/dtos/user-response.dto";
import { ApiErrorResponseDto } from "src/common/api-error-response.dto";

@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private service: UsersService) {}

  @Get("me")
  @ApiOperation({ summary: "Current user info" })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  async me(@JwtPayload() payload: JwtPayloadDto): Promise<UserResponseDto> {
    const user = await this.service.findById(payload.sub);
    if (!user) throw new NotFoundException("User not found");
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
