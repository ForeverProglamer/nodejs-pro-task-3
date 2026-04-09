import { UUID } from "crypto";

export default interface JwtUserDto {
  sub: UUID;
  email: string;
}
