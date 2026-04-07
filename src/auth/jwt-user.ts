import { UUID } from "crypto";

export default interface JwtUser {
  sub: UUID;
  email: string;
}
