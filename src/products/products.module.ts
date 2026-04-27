import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProductsService } from "./products.service";
import { ProductsController } from "./products.controller";
import Product from "./product.entity";
import { productsRepositoryProvider } from "./products.repository";
import { CommonModule } from "src/common/common.module";

@Module({
  imports: [TypeOrmModule.forFeature([Product]), CommonModule],
  providers: [ProductsService, productsRepositoryProvider],
  controllers: [ProductsController],
})
export class ProductsModule {}
