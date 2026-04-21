import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import Product from "./product.entity";
import { Repository } from "typeorm";
import { UUID } from "crypto";

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private repo: Repository<Product>) {}

  findById(id: UUID) {
    return this.repo.findOneBy({ id });
  }
}
