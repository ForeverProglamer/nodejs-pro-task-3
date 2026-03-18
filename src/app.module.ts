import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "./users/users.module";
import { OrdersModule } from "./orders/orders.module";
import { ProductsModule } from "./products/products.module";
import { RabbitMqModule } from "./rabbit-mq/rabbit-mq.module";
import { DebugModule } from './debug/debug.module';

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
  ],
})
export class AppModule {}
