import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "src/users/users.module";
import { JwtStrategy } from "./jwt.strategy";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { PasswordService } from "./password.service";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.getOrThrow("JWT_AT_SECRET"),
        signOptions: { expiresIn: Number(cfg.getOrThrow("JWT_AT_MAX_AGE_S")) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PasswordService],
})
export class AuthModule {}
