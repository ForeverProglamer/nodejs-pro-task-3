import { Controller, Get, NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { User } from "src/auth/user.decorator";
import JwtUserDto from "src/auth/dtos/jwt-user.dto";

@Controller("users")
export class UsersController {
  constructor(private service: UsersService) {}

  @Get("me")
  async me(@User() user: JwtUserDto) {
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
