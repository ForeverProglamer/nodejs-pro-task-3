import { UUID } from "crypto";
import { UserRoleValue } from "src/users/user.entity";

export default interface JwtPayloadDto {
  sub: UUID;
  email: string;
  roles: UserRoleValue[];
}
