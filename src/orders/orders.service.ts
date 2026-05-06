import { Inject, Injectable, Logger } from "@nestjs/common";
import { CreateOrderDto } from "./create-order.dto";
import { UUID } from "crypto";
import Order, { OrderStatus } from "./order.entity";
import OrderItem from "./order-item.entity";
import {
  CannotFindProductsError,
  FailedToCreateOrderError,
  NotEnoughItemsInStockError,
} from "src/common/errors";
import { RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";
import { ProcessOrderMessageDto } from "./process-order-message.dto";
import { IOrdersRepository, ORDERS_REPOSITORY } from "./orders.repository";
import { IUnitOfWork, UNIT_OF_WORK } from "src/common/unit-of-work";
import { MetricsService, OrderCreateResult } from "src/metrics/metrics.service";

type CreateOrderResult = {
  order: Order;
  isDuplicate: boolean;
};

@Injectable()
export class OrdersService {
  private readonly logger: Logger = new Logger(OrdersService.name);

  constructor(
    @Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
    @Inject(ORDERS_REPOSITORY) private readonly ordersRepo: IOrdersRepository,
    private readonly rabbitmq: RabbitMqService,
    private readonly metricsService: MetricsService,
  ) {}

  async createOrder(userId: UUID, dto: CreateOrderDto, idempotencyKey: UUID) {
    // TODO: ensure `dto.items` do not have duplicates, cause here we assume
    // that they don't
    this.logger.log("Creating order", { userId, idempotencyKey, dto });
    try {
      const result = await this.persistOrder(userId, dto, idempotencyKey);
      return result.isDuplicate
        ? this.handleDuplicateOrder(result.order, userId, idempotencyKey)
        : this.handleNewOrder(result.order, userId, idempotencyKey);
    } catch (error) {
      this.recordOrderCreationFailure(error);
      throw error;
    }
  }

  private persistOrder(
    userId: UUID,
    dto: CreateOrderDto,
    idempotencyKey: UUID,
  ): Promise<CreateOrderResult> {
    return this.uow.transaction(async (tx) => {
      const { result: order, isDuplicate } = await tx.ordersRepo.add({
        userId,
        idempotencyKey,
      });
      if (isDuplicate) return { order, isDuplicate };

      const products = await tx.productsRepo.findByIds(
        dto.items.map((i) => i.id),
      );
      if (products.length !== dto.items.length)
        throw new CannotFindProductsError(dto.items.length - products.length);

      const dtoIdToQty = new Map(dto.items.map((i) => [i.id, i.qty]));
      const partialItems: Partial<OrderItem>[] = [];
      for (const p of products) {
        const askedQty = dtoIdToQty.get(p.id) as number;
        if (p.stock < askedQty)
          throw new NotEnoughItemsInStockError(p.id, askedQty, p.stock);

        partialItems.push({
          orderId: order.id,
          productId: p.id,
          qty: askedQty,
          purchasePrice: p.price,
        });
        p.stock -= askedQty;
      }
      await tx.orderItemsRepo.extend(partialItems);
      await tx.productsRepo.extend(products);
      const result = await tx.ordersRepo.findOne({ id: order.id });
      if (!result) throw new FailedToCreateOrderError();
      await tx.commit();
      return { order: result, isDuplicate };
    });
  }

  private handleDuplicateOrder(
    order: Order,
    userId: UUID,
    idempotencyKey: UUID,
  ) {
    this.metricsService.incrementOrderCreated("duplicate");
    this.logger.log("Retrieved existing", { userId, idempotencyKey, order });
    return order;
  }

  private handleNewOrder(order: Order, userId: UUID, idempotencyKey: UUID) {
    this.metricsService.incrementOrderCreated("success");
    this.logger.log("Order created", { userId, idempotencyKey, order });
    this.rabbitmq.send(
      "orders.process",
      new ProcessOrderMessageDto(order.id, order.id),
    );
    return order;
  }

  private recordOrderCreationFailure(error: unknown) {
    this.metricsService.incrementOrderCreated(
      this.getOrderCreationFailureResult(error),
    );
  }

  private getOrderCreationFailureResult(error: unknown): OrderCreateResult {
    if (error instanceof CannotFindProductsError) return "product_not_found";
    if (error instanceof NotEnoughItemsInStockError) return "not_enough_stock";
    return "error";
  }

  findById(id: UUID, userId?: UUID) {
    // NOTE: userId is required for cases when user fetches
    // his own order data and is not required when admin does
    // so. And we rely on controllers to distinguish between the two.
    return this.ordersRepo.findOne({ id, userId });
  }

  list(
    status: OrderStatus,
    page: number,
    limit: number,
    from?: Date,
    to?: Date,
    userId?: UUID,
  ) {
    return this.ordersRepo.find({ status, page, limit, from, to, userId });
  }

  toDto(orders: Order[]) {
    return orders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        purchasePrice: i.purchasePrice,
      })),
    }));
  }
}
