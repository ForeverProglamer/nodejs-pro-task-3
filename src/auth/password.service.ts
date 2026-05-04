import { Injectable } from "@nestjs/common";
import { hash, verifyHash } from "./utils";

@Injectable()
export class PasswordService {
  hash(value: string): Promise<string> {
    return hash(value);
  }

  verify(hash: string, candidate: string): Promise<boolean> {
    return verifyHash(hash, candidate);
  }
}
