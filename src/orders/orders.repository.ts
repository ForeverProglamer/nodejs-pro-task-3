import { DataSource, FindOptionsWhere, Repository } from "typeorm";
import Order, { OrderStatus } from "./order.entity";
import { UUID } from "crypto";
import { InjectRepository } from "@nestjs/typeorm";

export class DuplicateEntityError extends Error {}

type LocalFindOptions = {
  status: OrderStatus;
  userId?: UUID;
  page: number;
  limit: number;
  from?: Date;
  to?: Date;
};

type DedupResult<T> = { result: T; isDuplicate: boolean };

type BasicOrder = Pick<Order, "userId" | "idempotencyKey"> & Partial<Order>;

const orderSelect: (keyof Order)[] = [
  "id",
  "status",
  "idempotencyKey",
  "createdAt",
  "updatedAt",
  "processedAt",
];

export interface IOrdersRepository {
  add(order: BasicOrder): Promise<DedupResult<Order>>;
  findOne(where: FindOptionsWhere<Order>): Promise<Order | null>;
  find(where: LocalFindOptions): Promise<Order[]>;
}

export class TypeOrmOrdersRepository implements IOrdersRepository {
  constructor(
    @InjectRepository(Order) private repo: Repository<Order>,
    private ds: DataSource,
  ) {}

  async add(order: BasicOrder): Promise<DedupResult<Order>> {
    try {
      const result = await this.repo.save(order);
      return { result, isDuplicate: false };
    } catch (err) {
      if (String(err?.code) === "23505") {
        // NOTE: At this point tx is aborted, so we cannot use the same repo
        // instance with the same connection
        const newRepo = this.ds.getRepository(Order);
        const result = await newRepo.findOneOrFail({
          where: { userId: order.userId, idempotencyKey: order.idempotencyKey },
          relations: { items: true },
          select: orderSelect,
        });
        return { result, isDuplicate: true };
      }
      throw err;
    }
  }

  findOne(where: FindOptionsWhere<Order>): Promise<Order | null> {
    return this.repo.findOne({
      where,
      relations: { items: true },
      select: orderSelect,
    });
  }

  find(where: LocalFindOptions): Promise<Order[]> {
    const { status, page, limit, to, from, userId } = where;
    const qb = this.repo
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
}

export const ORDERS_REPOSITORY = Symbol("ORDERS_REPOSITORY");

export const OrdersRepositoryProvider = {
  provide: ORDERS_REPOSITORY,
  useFactory: (ds: DataSource) =>
    new TypeOrmOrdersRepository(ds.getRepository(Order), ds),
  inject: [DataSource],
};
