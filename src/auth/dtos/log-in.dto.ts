import { IsEmail, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export default class LogInDto {
  @ApiProperty({ example: "user@mail.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "Strong-pass1*" })
  @IsString()
  password: string;
}
