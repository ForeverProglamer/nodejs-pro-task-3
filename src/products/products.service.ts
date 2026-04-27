import { Inject, Injectable } from "@nestjs/common";
import { UUID } from "crypto";
import {
  IProductsRepository,
  PRODUCTS_REPOSITORY,
} from "./products.repository";

@Injectable()
export class ProductsService {
  constructor(@Inject(PRODUCTS_REPOSITORY) private repo: IProductsRepository) {}

  findById(id: UUID) {
    return this.repo.findOneById(id);
  }
}
