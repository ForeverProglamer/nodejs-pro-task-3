import { IsEmail, IsStrongPassword } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export default class SignUpDto {
  @ApiProperty({ example: "user@mail.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Strong-pass1*" })
  @IsStrongPassword()
  password: string;
}
