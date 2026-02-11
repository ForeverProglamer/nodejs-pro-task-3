import { UUID } from "crypto";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  OneToMany,
} from "typeorm";

import type Order from "src/orders/order.entity";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

@Entity("users")
@Unique("UQ_users_email", ["email"])
export default class User {
  @PrimaryGeneratedColumn("uuid", { primaryKeyConstraintName: "PK_users_id" })
  id: UUID;

  @Column("varchar", { length: 100, nullable: false })
  email: string;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
    nullable: false,
  })
  role: UserRole;

  @CreateDateColumn({ name: "created_at", type: "timestamptz", utc: true })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz", utc: true })
  updatedAt: Date;

  @OneToMany("Order", (order: Order) => order.user)
  orders: Order[];
}
