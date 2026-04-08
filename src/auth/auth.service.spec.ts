import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import User from "src/users/user.entity";
import SignUpDto from "./sign-up.dto";
import { UsersService } from "src/users/users.service";
import {
  DuplicateEntityCreationError,
  EntityNotFoundError,
  IncorrectPasswordError,
} from "src/common/errors";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

const johnDoeId = randomUUID();
const johnDoeEmail = "johh.doe@mail.com";
const johnDoe: Partial<User> = {
  id: johnDoeId,
  email: johnDoeEmail,
  password: "$2b$12$Ql4xM709i0nz3tOLezOwguHF3uU8HCcA7.CUcPwG2MerwCXyfmdQG",
};
const johnDoePass = "john-doe-pass";

class MockUsersService {
  private repo: Partial<User>[];

  constructor() {
    this.repo = [johnDoe];
  }

  async create(dto: SignUpDto, password: string) {
    if (await this.findByEmail(dto.username))
      throw new DuplicateEntityCreationError(User.name, { ...dto });

    const user = { email: dto.username, password };
    this.repo.push(user);
    return user;
  }

  async findByEmail(email: string) {
    return this.repo.find((item) => item.email === email) ?? null;
  }

  async findById(id: string) {
    return this.repo.find((item) => item.id === id) ?? null;
  }
}

describe("AuthService", () => {
  let service: AuthService;

  const jwtService = {
    sign: jest.fn((payload) => "token"),
  };

  const configService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useClass: MockUsersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jwtService.sign.mockClear();
  });

  describe(".login", () => {
    it("returns access token response for successful log in", async () => {
      const dto = { username: johnDoeEmail, password: johnDoePass };
      const result = await service.login(dto);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.tokenType).toBe("Bearer");
      expect(result.expiresIn).toBeDefined();

      // Signs access and refresh tokens
      expect(jwtService.sign.mock.calls.length).toBe(2);
      expect(result.accessToken).toBe("token");
      expect(result.refreshToken).toBe("token");
    });

    it("throws an error when user not found", async () => {
      const dto = { username: "non.existing@mail.com", password: "pass" };
      await expect(service.login(dto)).rejects.toThrow(EntityNotFoundError);
    });

    it("throws an error when password is incorrect", async () => {
      const dto = { username: johnDoeEmail, password: "randompass" };
      await expect(service.login(dto)).rejects.toThrow(IncorrectPasswordError);
    });
  });

  describe(".signUp", () => {
    it("returns newly created user with hashed password", async () => {
      const dto = { username: "new@mail.com", password: "new-secret" };
      const result = await service.signUp(dto);
      expect(result.email).toBe(dto.username);
      expect(result.password).not.toBe(dto.password);
    });

    it("throws an error when user already exists", async () => {
      const dto = { username: johnDoeEmail, password: "new-secret" };
      await expect(service.signUp(dto)).rejects.toThrow(
        DuplicateEntityCreationError,
      );
    });
  });

  describe(".refreshAccessToken", () => {
    it("returns token response when user exists", async () => {
      const jwtPayload = { sub: johnDoeId, email: johnDoeEmail };
      const refreshToken = "token";
      const result = await service.refreshAccessToken(jwtPayload, refreshToken);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.tokenType).toBe("Bearer");
      expect(result.expiresIn).toBeDefined();

      // Signs access and refresh tokens
      expect(jwtService.sign.mock.calls.length).toBe(2);
      expect(result.accessToken).toBe("token");
      expect(result.refreshToken).toBe("token");
    });

    it("throws an error when user not found", async () => {
      const jwtPayload = { sub: randomUUID(), email: "non.existing@mail.com" };
      const refreshToken = "token";
      await expect(
        service.refreshAccessToken(jwtPayload, refreshToken),
      ).rejects.toThrow(EntityNotFoundError);
    });
  });
});
