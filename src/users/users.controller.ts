import { Controller, Get, NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtPayload } from "src/auth/decorators";
import JwtPayloadDto from "src/auth/dtos/jwt-payload.dto";
import { ApiBearerAuth } from "@nestjs/swagger";

@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private service: UsersService) {}

  @Get("me")
  async me(@JwtPayload() payload: JwtPayloadDto) {
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
