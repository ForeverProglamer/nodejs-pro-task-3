import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "./users/users.module";
import { OrdersModule } from "./orders/orders.module";
import { ProductsModule } from "./products/products.module";
import { RabbitMqModule } from "./rabbit-mq/rabbit-mq.module";
import { DebugModule } from "./debug/debug.module";
import { AppController } from "./app.controller";
import { CorrelationIdMiddleware } from "./common/correlation-id.middleware";
import { AuthModule } from "./auth/auth.module";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { HttpLoggerMiddleware } from "./common/http-logger.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.getOrThrow<string>("DB_HOST"),
        port: Number(configService.getOrThrow<string>("DB_PORT")),
        username: configService.getOrThrow<string>("DB_USER"),
        password: configService.getOrThrow<string>("DB_PASSWORD"),
        database: configService.getOrThrow<string>("DB_NAME"),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    UsersModule,
    OrdersModule,
    ProductsModule,
    RabbitMqModule,
    DebugModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes("*");
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
