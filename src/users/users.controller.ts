import { Controller, Get, NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtPayload } from "src/auth/decorators";
import JwtPayloadDto from "src/auth/dtos/jwt-payload.dto";

@Controller("users")
export class UsersController {
  constructor(private service: UsersService) {}

  @Get("me")
  async me(@JwtPayload() user: JwtPayloadDto) {
    const currentUser = await this.service.findById(user.sub);
    if (!currentUser) throw new NotFoundException("User not found");
    return {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      createdAt: currentUser.createdAt,
    };
  }
}
