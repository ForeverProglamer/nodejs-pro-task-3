import { Module } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import Product from "src/products/product.entity";
import Order from "./order.entity";
import OrderItem from "./order-item.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Product, Order, OrderItem])],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
