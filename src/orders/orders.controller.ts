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
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import OrderResponseDto from "./order-response.dto";
import { ApiErrorResponseDto } from "src/common/api-error-response.dto";

@ApiBearerAuth()
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create order" })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({
    type: ApiErrorResponseDto,
    description: "Missing idempotency-key header",
  })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: "Product not found",
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: "Not enough items in stock",
  })
  @ApiInternalServerErrorResponse({
    type: ApiErrorResponseDto,
    description: "Failed to create order",
  })
  @ApiHeader({
    name: "idempotency-key",
    required: true,
    example: "f266fcc6-88d2-4dfb-b5c3-05df42cc03b0",
  })
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
  @ApiOperation({ summary: "Get order by ID" })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto })
  @ApiParam({ name: "id", example: "0e8fd161-5c56-4dba-8c7a-6f422ea4d8ee" })
  async findById(
    @JwtPayload("sub") userId: UUID,
    @Param("id", ParseUUIDPipe) id: UUID,
  ) {
    const result = await this.ordersService.findById(id, userId);
    if (!result) throw new NotFoundException("Order not found");
    return this.ordersService.toDto([result])[0];
  }

  @Get()
  @ApiOperation({ summary: "Find orders" })
  @ApiOkResponse({ type: [OrderResponseDto] })
  @ApiQuery({ name: "status", required: false, default: OrderStatus.CREATED })
  @ApiQuery({ name: "page", required: false, default: 1 })
  @ApiQuery({ name: "limit", required: false, default: 10 })
  @ApiQuery({ name: "from", required: false })
  @ApiQuery({ name: "to", required: false })
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
