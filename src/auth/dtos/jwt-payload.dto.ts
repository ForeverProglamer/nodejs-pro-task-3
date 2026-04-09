import { UUID } from "crypto";

export default interface JwtPayloadDto {
  sub: UUID;
  email: string;
}
