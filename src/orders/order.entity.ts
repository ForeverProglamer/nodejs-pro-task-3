import { UUID } from "crypto";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

import type User from "src/users/user.entity";
import type OrderItem from "./order-item.entity";

export enum OrderStatus {
  CREATED = "created",
  CANCELED = "canceled",
  PROCESSED = "processed",
  PAID = "paid",
}

@Entity("orders")
@Index("IX_orders_user_id_status_created_at", ["userId", "status", "createdAt"])
@Unique("UQ_orders_user_id_idempotency_key", ["userId", "idempotencyKey"])
export default class Order {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "PK_orders_id" })
  id: UUID;

  @Index("IX_orders_user_id")
  @Column({ name: "user_id", type: "uuid", nullable: false })
  userId: UUID;

  @ManyToOne("User", (user: User) => user.orders, { onDelete: "CASCADE" })
  @JoinColumn({
    name: "user_id",
    foreignKeyConstraintName: "FK_orders_user_id_users_id",
  })
  user: User;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.CREATED,
    nullable: false,
  })
  status: OrderStatus;

  @Column({ name: "idempotency_key", type: "uuid", nullable: false })
  idempotencyKey: UUID;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", utc: true })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", utc: true })
  updatedAt: Date;

  @Column({
    name: "processed_at",
    type: "timestamptz",
    utc: true,
    nullable: true,
  })
  processedAt: Date | null;

  @OneToMany("OrderItem", (item: OrderItem) => item.order)
  items: OrderItem[];
}
