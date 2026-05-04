import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import Product from "src/products/product.entity";
import Order from "./order.entity";
import OrderItem from "./order-item.entity";
import { RabbitMqModule } from "src/rabbit-mq/rabbit-mq.module";
import { OrdersWorkerService } from "./orders-worker.service";
import ProcessedMessage from "src/common/processed-message.entity";
import { OrdersRepositoryProvider } from "./orders.repository";
import { ProductsModule } from "src/products/products.module";
import { OrderItemsRepositoryProvider } from "./order-items.repository";
import { CommonModule } from "src/common/common.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Order, OrderItem, ProcessedMessage]),
    RabbitMqModule,
    ProductsModule,
    CommonModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersWorkerService,
    OrdersRepositoryProvider,
    OrderItemsRepositoryProvider,
  ],
})
export class OrdersModule {}
