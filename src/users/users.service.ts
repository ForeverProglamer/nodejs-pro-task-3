import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import User from "./user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import SignUpDto from "src/auth/sign-up.dto";
import { DuplicateEntityCreationError } from "src/common/errors";
import { UUID } from "crypto";

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async create(signUpDto: SignUpDto, hashedPassword: string) {
    try {
      return await this.repo.save({
        email: signUpDto.username,
        password: hashedPassword,
      });
    } catch (err) {
      if (String(err?.code) === "23505")
        throw new DuplicateEntityCreationError(User.name, { ...signUpDto });
      throw err;
    }
  }

  findById(id: UUID) {
    return this.repo.findOneBy({ id });
  }

  findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }
}
