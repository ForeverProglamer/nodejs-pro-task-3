import { DataSource, Repository } from "typeorm";
import { UUID } from "crypto";
import Product from "./product.entity";
import { Provider } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

export interface IProductsRepository {
  add(product: Partial<Product>): Promise<Product>;
  extend(products: Partial<Product>[]): Promise<Product[]>;
  findOneById(id: UUID): Promise<Product | null>;
  findByIds(ids: UUID[]): Promise<Product[]>;
}

export class TypeOrmProductsRepository implements IProductsRepository {
  constructor(@InjectRepository(Product) private repo: Repository<Product>) {}

  add(product: Partial<Product>): Promise<Product> {
    return this.repo.save(product);
  }

  extend(products: Partial<Product>[]): Promise<Product[]> {
    return this.repo.save(products);
  }

  findOneById(id: UUID): Promise<Product | null> {
    return this.repo.findOneBy({ id });
  }

  findByIds(ids: UUID[]): Promise<Product[]> {
    return this.repo
      .createQueryBuilder("product")
      .where("product.id IN (:...ids)", { ids })
      .setLock("pessimistic_write")
      .getMany();
  }
}

export const PRODUCTS_REPOSITORY = Symbol("PRODUCTS_REPOSITORY");

export const productsRepositoryProvider: Provider = {
  provide: PRODUCTS_REPOSITORY,
  useFactory: (ds: DataSource) =>
    new TypeOrmProductsRepository(ds.getRepository(Product)),
  inject: [DataSource],
};
