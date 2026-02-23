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
  ParseIntPipe,
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
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query("from", new ParseDatePipe({ optional: true })) from?: Date,
    @Query("to", new ParseDatePipe({ optional: true })) to?: Date,
  ) {
    const inspect = <T>(val: T) => ({ value: val, type: typeof val });
    console.log({
      userId: inspect(userId),
      status: inspect(status),
      from: inspect(from),
      to: inspect(to),
      page: inspect(page),
      limit: inspect(limit),
    });
    const orders = await this.ordersService.list(
      userId,
      status,
      page,
      limit,
      from,
      to,
    );
    return this.ordersService.toDto(orders);
  }
}
