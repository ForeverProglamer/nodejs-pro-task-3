import { Injectable, Logger } from "@nestjs/common";
import { CreateOrderDto } from "./create-order.dto";
import { UUID } from "crypto";
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from "typeorm";
import Order, { OrderStatus } from "./order.entity";
import Product from "src/products/product.entity";
import OrderItem from "./order-item.entity";
import { InjectRepository } from "@nestjs/typeorm";
import {
  CannotFindProductsError,
  FailedToCreateOrderError,
  NotEnoughItemsInStockError,
} from "src/common/errors";
import { RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";
import { ProcessOrderMessageDto } from "./process-order-message.dto";
import { sleep } from "src/common/utils";

@Injectable()
export class OrdersService {
  private readonly logger: Logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly rabbitmq: RabbitMqService,
  ) {}

  async createOrder(userId: UUID, dto: CreateOrderDto, idempotencyKey: UUID) {
    // TODO: ensure `dto.items` do not have duplicates, cause here we assume
    // that they don't
    this.logger.log("Creating order", { userId, idempotencyKey, dto });
    const [order, isDuplicate] = await this.dataSource.transaction(
      async (mngr) => {
        const ordersRepo = mngr.getRepository(Order);
        const productsRepo = mngr.getRepository(Product);
        const orderItemsRepo = mngr.getRepository(OrderItem);

        const { order, isDuplicate } = await this.createOrderWithDedup(
          ordersRepo,
          { userId, idempotencyKey },
        );
        if (isDuplicate) return [order, isDuplicate];

        const products = await productsRepo
          .createQueryBuilder("product")
          .where("product.id IN (:...ids)", {
            ids: dto.items.map((i) => i.id),
          })
          .setLock("pessimistic_write")
          .getMany();
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
        await orderItemsRepo.save(partialItems);
        await productsRepo.save(products);
        return [
          await this.findOrderOrFail(ordersRepo, { id: order.id }),
          isDuplicate,
        ];
      },
    );

    if (isDuplicate) {
      this.logger.log("Retrieved existing", { userId, idempotencyKey, order });
      return order;
    }

    this.logger.log("Order created", { userId, idempotencyKey, order });
    this.rabbitmq.send(
      "orders.process",
      new ProcessOrderMessageDto(order.id, order.id),
    );
    return order;
  }

  private async createOrderWithDedup(
    ordersRepo: Repository<Order>,
    { userId, idempotencyKey }: Pick<Order, "userId" | "idempotencyKey">,
  ): Promise<{ order: Order; isDuplicate: boolean }> {
    try {
      const order = await ordersRepo.save({ userId, idempotencyKey });
      return { order, isDuplicate: false };
    } catch (err) {
      if (String(err?.code) === "23505") {
        // NOTE: At this point tx is aborted, so we cannot use the same repo
        // instance with the same connection
        const order = await this.findOrderOrFail(this.ordersRepo, {
          userId,
          idempotencyKey,
        });
        return { order, isDuplicate: true };
      }
      throw err;
    }
  }

  private async findOrderOrFail(
    repo: Repository<Order>,
    where: FindOptionsWhere<Order>,
  ) {
    const created = await repo.findOne({ where, relations: { items: true } });
    if (!created) {
      throw new FailedToCreateOrderError();
    }
    return created;
  }

  async processOrderMessage(
    msg: ProcessOrderMessageDto,
    manager: EntityManager,
  ) {
    await sleep(2);
    if (msg.simulateFailure) {
      // Debug-only
      const { reason, stopOnAttempt } = msg.simulateFailure;
      if (stopOnAttempt === msg.attempt) return;
      throw new Error(reason);
    }
    const ordersRepo = manager.getRepository(Order);
    const { orderId } = msg;
    await ordersRepo.update(
      { id: orderId },
      { id: orderId, status: OrderStatus.PROCESSED, processedAt: new Date() },
    );
  }

  findById(id: UUID, userId?: UUID) {
    // NOTE: userId is required for cases when user fetches
    // his own order data and is not required when admin does
    // so. And we rely on controllers to distinguish between the two.
    return this.ordersRepo.findOne({
      where: { id, userId },
      relations: { items: true },
      select: [
        "id",
        "status",
        "idempotencyKey",
        "createdAt",
        "updatedAt",
        "processedAt",
      ],
    });
  }

  list(
    status: OrderStatus,
    page: number,
    limit: number,
    from?: Date,
    to?: Date,
    userId?: UUID,
  ) {
    const qb = this.ordersRepo
      .createQueryBuilder("orders")
      .select(["orders.id", "orders.status", "orders.createdAt"])
      .leftJoin("orders.items", "items")
      .addSelect([
        "items.orderId",
        "items.productId",
        "items.qty",
        "items.purchasePrice",
      ])
      .where("orders.status = :status", { status })
      .orderBy("orders.createdAt", "DESC")
      .take(limit)
      .skip((page - 1) * limit);

    if (userId) {
      qb.andWhere("orders.userId = :userId", { userId });
    }

    if (from) {
      qb.andWhere("orders.createdAt >= :from", { from });
    }
    if (to) {
      qb.andWhere("orders.createdAt <= :to", { to });
    }
    return qb.getMany();
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
