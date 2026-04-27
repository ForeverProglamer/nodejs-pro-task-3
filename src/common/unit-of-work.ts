import { Provider } from "@nestjs/common";
import OrderItem from "src/orders/order-item.entity";
import {
  IOrderItemsRepository,
  TypeOrmOrderItemsRepository,
} from "src/orders/order-items.repository";
import Order from "src/orders/order.entity";
import {
  IOrdersRepository,
  TypeOrmOrdersRepository,
} from "src/orders/orders.repository";
import Product from "src/products/product.entity";
import {
  IProductsRepository,
  TypeOrmProductsRepository,
} from "src/products/products.repository";
import { DataSource, QueryRunner } from "typeorm";

export interface IUnitOfWork {
  transaction<T>(cb: (tx: AbstractTransaction) => Promise<T>): Promise<T>;
}

abstract class AbstractTransaction {
  productsRepo: IProductsRepository;
  ordersRepo: IOrdersRepository;
  orderItemsRepo: IOrderItemsRepository;

  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;

  [Symbol.asyncDispose](): Promise<void> {
    return this.rollback();
  }
}

class TypeOrmTransaction extends AbstractTransaction {
  private runner: QueryRunner;
  private finished = false;

  protected constructor(runner: QueryRunner, ds: DataSource) {
    super();
    this.runner = runner;
    this.productsRepo = new TypeOrmProductsRepository(
      this.runner.manager.getRepository(Product),
    );
    this.ordersRepo = new TypeOrmOrdersRepository(
      this.runner.manager.getRepository(Order),
      ds,
    );
    this.orderItemsRepo = new TypeOrmOrderItemsRepository(
      this.runner.manager.getRepository(OrderItem),
    );
  }

  static async create(dataSource: DataSource) {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    return new TypeOrmTransaction(runner, dataSource);
  }

  async commit(): Promise<void> {
    if (this.finished) return;
    await this.runner.commitTransaction();
    this.finished = true;
  }

  async rollback(): Promise<void> {
    if (this.finished) return;
    await this.runner.rollbackTransaction();
    this.finished = true;
  }

  async dispose() {
    if (this.runner.isReleased) return;
    await this.runner.release();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await super[Symbol.asyncDispose]();
    await this.dispose();
  }
}

class TypeOrmUnitOfWork implements IUnitOfWork {
  constructor(private dataSource: DataSource) {}

  async transaction<T>(
    cb: (tx: AbstractTransaction) => Promise<T>,
  ): Promise<T> {
    await using tx = await TypeOrmTransaction.create(this.dataSource);
    return await cb(tx);
  }
}

export const UNIT_OF_WORK = Symbol("UNIT_OF_WORK");
export const UnitOfWorkProvider: Provider = {
  provide: UNIT_OF_WORK,
  useFactory: (ds: DataSource) => new TypeOrmUnitOfWork(ds),
  inject: [DataSource],
};
