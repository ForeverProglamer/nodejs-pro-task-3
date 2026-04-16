import { IsEmail, IsString } from "class-validator";

export default class LogInDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
