import { DataSource } from "typeorm";

import { randomUUID } from "crypto";

import User, { UserRole } from "../users/user.entity";
import Product from "../products/product.entity";
import Order, { OrderStatus } from "../orders/order.entity";
import OrderItem from "../orders/order-item.entity";
import { hash } from "src/auth/utils";

import {
  ADMIN_EMAIL,
  ADMIN_PASS,
  USER_EMAIL,
  USER_PASS,
  productData,
} from "./constants";

const ensureInitializedDataSource = async (ds?: DataSource) => {
  if (!ds) {
    ({ default: ds } = await import("../../data-source"));
    await ds.initialize();
    return ds;
  }
  if (!ds.isInitialized) await ds.initialize();
  return ds;
};

type SeedOptions = {
  ds?: DataSource;
  silentMode?: boolean;
};

export default async function seed({ ds, silentMode = true }: SeedOptions) {
  const log = silentMode ? () => {} : console.log;
  const dataSource = await ensureInitializedDataSource(ds);

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    log("🌱 Seeding started...");

    const manager = queryRunner.manager;

    const userRepo = manager.getRepository(User);
    const productRepo = manager.getRepository(Product);
    const orderRepo = manager.getRepository(Order);
    const orderItemRepo = manager.getRepository(OrderItem);

    /**
     * USERS
     */
    let admin = await userRepo.findOne({
      where: { email: ADMIN_EMAIL },
    });

    if (!admin) {
      admin = userRepo.create({
        email: ADMIN_EMAIL,
        password: await hash(ADMIN_PASS),
        role: UserRole.ADMIN,
      });

      await userRepo.save(admin);
      log("✅ Admin created");
    }

    let user = await userRepo.findOne({
      where: { email: USER_EMAIL },
    });

    if (!user) {
      user = userRepo.create({
        email: USER_EMAIL,
        password: await hash(USER_PASS),
        role: UserRole.USER,
      });

      await userRepo.save(user);
      log("✅ User created");
    }

    /**
     * PRODUCTS
     */
    const products: Product[] = [];

    for (const data of productData) {
      let product = await productRepo.findOne({
        where: { title: data.title },
      });

      if (!product) {
        product = productRepo.create(data);
        await productRepo.save(product);
        log(`✅ Product ${data.title} created`);
      }

      products.push(product);
    }

    /**
     * ORDER
     * Avoid duplicating order if script is re-run
     */
    const existingOrder = await orderRepo.findOne({
      where: {
        user: { id: user.id },
        status: OrderStatus.CREATED,
      },
      relations: ["user"],
    });

    let order: Order;

    if (!existingOrder) {
      order = orderRepo.create({
        user,
        idempotencyKey: randomUUID(),
      });

      await orderRepo.save(order);
      log("✅ Order created");
    } else {
      order = existingOrder;
      log("ℹ️ Order already exists");
    }

    /**
     * ORDER ITEMS
     */
    const existingItems = await orderItemRepo.find({
      where: {
        order: { id: order.id },
      },
      relations: ["order", "product"],
    });

    if (existingItems.length === 0) {
      const item1 = orderItemRepo.create({
        order,
        product: products[0],
        qty: 1,
        purchasePrice: products[0].price,
      });

      const item2 = orderItemRepo.create({
        order,
        product: products[1],
        qty: 2,
        purchasePrice: products[1].price,
      });

      await orderItemRepo.save([item1, item2]);

      log("✅ Order items created");
    } else {
      log("ℹ️ Order items already exist");
    }

    await queryRunner.commitTransaction();
    log("🎉 Seeding finished successfully");
  } catch (error) {
    log("❌ Seeding failed:", error);
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
    // NOTE: This code does not control lifecycle of injected DataSource
    // `.destroy()` only if it was created here.
    if (!ds) await dataSource.destroy();
  }
}
