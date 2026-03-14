import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import Product from "src/products/product.entity";
import Order from "./order.entity";
import OrderItem from "./order-item.entity";
import { RabbitMqModule } from "src/rabbit-mq/rabbit-mq.module";
import { OrdersWorkerService } from "./orders-worker.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order, OrderItem]),
    RabbitMqModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersWorkerService],
})
export class OrdersModule {}
