import { Injectable } from "@nestjs/common";
import { CreateOrderDto } from "./create-order.dto";
import { UUID } from "crypto";
import { DataSource, Repository } from "typeorm";
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
import { ProcessOrderMessageDto } from "./order-processed-message.dto";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly rabbitmq: RabbitMqService,
  ) {}

  async createOrder(dto: CreateOrderDto, idempotencyKey: UUID) {
    console.log(`[${new Date().toISOString()}]:INFO:Initiating order creation`);
    console.log({ dto, idempotencyKey });
    const created = await this.dataSource.transaction(async (mngr) => {
      const ordersRepo = mngr.getRepository(Order);
      const productsRepo = mngr.getRepository(Product);
      const orderItemsRepo = mngr.getRepository(OrderItem);

      const existingOrder = await ordersRepo.findOne({
        where: { userId: dto.userId, idempotencyKey },
        relations: { items: true },
      });
      if (existingOrder) return existingOrder;

      const dtoProductIds = [...new Set(dto.items.map((i) => i.id))];
      const products = await productsRepo
        .createQueryBuilder("product")
        .where("product.id IN (:...ids)", { ids: dtoProductIds })
        .setLock("pessimistic_write")
        .getMany();
      if (products.length !== dto.items.length)
        throw new CannotFindProductsError(dto.items.length - products.length);

      console.log({ products });
      const dtoIdToQty = new Map(dto.items.map((i) => [i.id, i.qty]));
      const order = await ordersRepo.save({
        userId: dto.userId,
        idempotencyKey,
      });
      console.log({ order });

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
      const items = await orderItemsRepo.save(partialItems);
      const updatedProducts = await productsRepo.save(products);
      console.log({ items });
      console.log({ updatedProducts });

      return await ordersRepo.findOne({
        where: { id: order.id },
        relations: { items: true },
      });
    });

    if (!created) {
      throw new FailedToCreateOrderError();
    }

    this.rabbitmq.send(
      "orders.process",
      new ProcessOrderMessageDto(created.id, created.id),
    );

    return created;
  }

  list(
    userId: UUID,
    status: OrderStatus,
    page: number,
    limit: number,
    from?: Date,
    to?: Date,
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
      .where("orders.userId = :userId", { userId })
      .andWhere("orders.status = :status", { status })
      .orderBy("orders.createdAt", "DESC")
      .take(limit)
      .skip((page - 1) * limit);

    if (from) {
      qb.andWhere("orders.createdAt >= :from", { from });
    }
    if (to) {
      qb.andWhere("orders.createdAt <= :to", { to });
    }
    console.log(qb.getSql());
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
