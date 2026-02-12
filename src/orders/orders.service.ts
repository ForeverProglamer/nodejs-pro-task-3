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

  async createOrder(dto: CreateOrderDto, idempotencyKey: UUID) {
    console.log(`[${new Date().toISOString()}]:INFO:Initiating order creation`);
    console.log({ dto, idempotencyKey });

    const existingOrder = await this.ordersRepo.findOne({
      where: { userId: dto.userId, idempotencyKey },
      relations: { items: true },
    });
    if (existingOrder) return existingOrder;

    const products = await this.productsRepo.find({
      where: { id: In(dto.items.map((i) => i.id)) },
    });
    console.log({ products });
    const dtoIdToQty = new Map(dto.items.map((i) => [i.id, i.qty]));

    const order = await this.ordersRepo.save({
      userId: dto.userId,
      idempotencyKey,
    });
    console.log({ order });
    const items = await this.orderItemsRepo.save(
      products.map((p) => ({
        orderId: order.id,
        productId: p.id,
        qty: dtoIdToQty.get(p.id) ?? 0,
        purchasePrice: p.price,
      })),
    );
    console.log({ items });

    const latestOrder = await this.ordersRepo.findOne({
      where: { id: order.id },
      relations: { items: true },
    });
    return latestOrder;
  }
}
