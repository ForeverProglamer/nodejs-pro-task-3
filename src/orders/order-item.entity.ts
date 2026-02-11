import { UUID } from "crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  UpdateDateColumn,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import type Order from "./order.entity";
import type Product from "src/products/product.entity";

@Entity("order_items")
export default class OrderItem {
  @PrimaryColumn({
    name: "order_id",
    type: "uuid",
    primaryKeyConstraintName: "PK_order_items_order_id_product_id",
  })
  orderId: UUID;

  @PrimaryColumn({
    name: "product_id",
    type: "uuid",
    primaryKeyConstraintName: "PK_order_items_order_id_product_id",
  })
  productId: UUID;

  @ManyToOne("Order", (order: Order) => order.items, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "order_id",
    foreignKeyConstraintName: "FK_order_items_order_id_orders_id",
  })
  order: Order;

  @ManyToOne("Product", (product: Product) => product.items, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({
    name: "product_id",
    foreignKeyConstraintName: "FK_order_items_product_id_products_id",
  })
  product: Product;

  @Column("int", { nullable: false })
  qty: number;

  @Column("decimal", { name: "purchase_price", nullable: false })
  purchasePrice: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", utc: true })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", utc: true })
  updatedAt: Date;
}
