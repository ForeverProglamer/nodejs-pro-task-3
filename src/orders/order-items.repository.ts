import { DataSource, Repository } from "typeorm";
import OrderItem from "./order-item.entity";
import { InjectRepository } from "@nestjs/typeorm";

export interface IOrderItemsRepository {
  add(item: Partial<OrderItem>): Promise<OrderItem>;
  extend(items: Partial<OrderItem>[]): Promise<OrderItem[]>;
}

export class TypeOrmOrderItemsRepository implements IOrderItemsRepository {
  constructor(
    @InjectRepository(OrderItem) private repo: Repository<OrderItem>,
  ) {}

  add(item: Partial<OrderItem>): Promise<OrderItem> {
    return this.repo.save(item);
  }

  extend(items: Partial<OrderItem>[]): Promise<OrderItem[]> {
    return this.repo.save(items);
  }
}

export const ORDER_ITEMS_REPOSITORY = Symbol("ORDER_ITEMS_REPOSITORY");

export const OrderItemsRepositoryProvider = {
  provide: ORDER_ITEMS_REPOSITORY,
  useFactory: (ds: DataSource) =>
    new TypeOrmOrderItemsRepository(ds.getRepository(OrderItem)),
  inject: [DataSource],
};
