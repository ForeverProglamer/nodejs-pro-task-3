import { Injectable } from "@nestjs/common";
import { CreateOrderDto } from "./create-order.dto";
import { UUID } from "crypto";
import { DataSource, In, Repository } from "typeorm";
import Order from "./order.entity";
import Product from "src/products/product.entity";
import OrderItem from "./order-item.entity";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly ordersRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  createOrder(dto: CreateOrderDto, idempotencyKey: UUID) {
    console.log(`[${new Date().toISOString()}]:INFO:Initiating order creation`);
    console.log({ dto, idempotencyKey });
    return this.dataSource.transaction(async (mngr) => {
      const ordersRepo = mngr.getRepository(Order);
      const productsRepo = mngr.getRepository(Product);
      const orderItemsRepo = mngr.getRepository(OrderItem);

      const existingOrder = await ordersRepo.findOne({
        where: { userId: dto.userId, idempotencyKey },
        relations: { items: true },
      });
      if (existingOrder) return existingOrder;

      const products = await productsRepo.find({
        where: { id: In(dto.items.map((i) => i.id)) },
      });
      if (products.length !== dto.items.length) {
        throw new Error(
          `Some products can not be found: ${dto.items.length - products.length} product(s) missing`,
        );
      }
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
        if (p.stock < askedQty) {
          throw new Error(
            `Product ${p.id} does not have enough of stock: required ${askedQty}, stock ${p.stock}`,
          );
        }
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
  }
}
