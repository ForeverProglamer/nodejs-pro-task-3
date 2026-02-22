import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  ParseDatePipe,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./create-order.dto";
import { UUID } from "crypto";
import { OrderStatus } from "./order.entity";

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

  @Get()
  async list(
    @Query("userId", ParseUUIDPipe) userId: UUID, // TODO: Infer from JWT
    @Query(
      "status",
      new DefaultValuePipe(OrderStatus.CREATED),
      new ParseEnumPipe(OrderStatus),
    )
    status: OrderStatus,
    @Query("from", new ParseDatePipe({ optional: true })) from?: Date,
    @Query("to", new ParseDatePipe({ optional: true })) to?: Date,
  ) {
    const inspect = <T>(val: T) => ({ value: val, type: typeof val });
    console.log({
      userId: inspect(userId),
      status: inspect(status),
      from: inspect(from),
      to: inspect(to),
    });
    const orders = await this.ordersService.list(userId, status, from, to);
    return this.ordersService.toDto(orders);
  }
}
