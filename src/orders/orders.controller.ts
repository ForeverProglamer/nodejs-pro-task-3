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
  NotFoundException,
  Param,
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
import { JwtPayload } from "src/auth/decorators";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @HttpCode(HttpStatus.CREATED)
  @Post()
  async create(
    @JwtPayload("sub") userId: UUID,
    @Body() dto: CreateOrderDto,
    @Headers("idempotency-key") idempotencyKey?: UUID,
  ) {
    if (!idempotencyKey)
      throw new BadRequestException("'Idempotency-Key' header is missing");
    const order = await this.ordersService.createOrder(
      userId,
      dto,
      idempotencyKey,
    );
    if (!order)
      throw new InternalServerErrorException("Failed to create order");
    return order;
  }

  @Get(":id")
  async findById(
    @JwtPayload("sub") userId: UUID,
    @Param("id", ParseUUIDPipe) id: UUID,
  ) {
    const result = await this.ordersService.findById(id, userId);
    if (!result) throw new NotFoundException("Order not found");
    return this.ordersService.toDto([result])[0];
  }

  @Get()
  async list(
    @JwtPayload("sub") userId: UUID,
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
    const orders = await this.ordersService.list(
      status,
      page,
      limit,
      from,
      to,
      userId,
    );
    return this.ordersService.toDto(orders);
  }
}
