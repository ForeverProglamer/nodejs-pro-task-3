import { ApiProperty } from "@nestjs/swagger";
import { UUID } from "crypto";
import { UserRole } from "src/users/user.entity";

export default class UserResponseDto {
  @ApiProperty({ example: "0e8fd161-5c56-4dba-8c7a-6f422ea4d8ee" })
  id: UUID;

  @ApiProperty({ example: "user@mail.com" })
  email: string;

  @ApiProperty({ enum: UserRole })
  role: UserRole;

  @ApiProperty({ type: Date })
  createdAt: Date;
}
