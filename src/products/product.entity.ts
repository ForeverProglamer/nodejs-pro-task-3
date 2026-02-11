import { UUID } from "crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import type OrderItem from "src/orders/order-item.entity";

@Entity("products")
export default class Product {
  @PrimaryGeneratedColumn("uuid", {
    primaryKeyConstraintName: "PK_products_id",
  })
  id: UUID;

  @Column("varchar", { length: 200, nullable: false })
  title: string;

  @Column("text")
  description: string;

  @Column("int", { nullable: false })
  stock: number;

  @Column("decimal", { nullable: false })
  price: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", utc: true })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", utc: true })
  updatedAt: Date;

  @OneToMany("OrderItem", (item: OrderItem) => item.product)
  items: OrderItem[];
}
