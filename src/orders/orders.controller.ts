import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  Post,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./create-order.dto";
import { UUID } from "crypto";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @Body() dto: CreateOrderDto,
    @Headers("idempotency-key") idempotencyKey?: UUID,
  ) {
    if (!idempotencyKey)
      throw new BadRequestException("'Idempotency-Key' header is missing");
    const order = await this.ordersService.createOrder(dto, idempotencyKey);
    if (!order)
      throw new InternalServerErrorException("Failed to create order");
    return order;
  }
}
