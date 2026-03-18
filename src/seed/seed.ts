import AppDataSource from "../../data-source";

import User, { UserRole } from "../users/user.entity";
import Product from "../products/product.entity";
import Order, { OrderStatus } from "../orders/order.entity";
import OrderItem from "../orders/order-item.entity";
import { randomUUID } from "crypto";

const productData = [
  {
    title: "Laptop",
    description: "High performance laptop",
    stock: 10,
    price: "1200",
  },
  {
    title: "Mouse",
    description: "Wireless mouse",
    stock: 50,
    price: "25",
  },
  {
    title: "Keyboard",
    description: "Mechanical keyboard",
    stock: 30,
    price: "100",
  },
];

async function seed() {
  await AppDataSource.initialize();

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log("🌱 Seeding started...");

    const manager = queryRunner.manager;

    const userRepo = manager.getRepository(User);
    const productRepo = manager.getRepository(Product);
    const orderRepo = manager.getRepository(Order);
    const orderItemRepo = manager.getRepository(OrderItem);

    /**
     * USERS
     */
    let admin = await userRepo.findOne({
      where: { email: "admin@example.com" },
    });

    if (!admin) {
      admin = userRepo.create({
        email: "admin@example.com",
        role: UserRole.ADMIN,
      });

      await userRepo.save(admin);
      console.log("✅ Admin created");
    }

    let user = await userRepo.findOne({
      where: { email: "user@example.com" },
    });

    if (!user) {
      user = userRepo.create({
        email: "user@example.com",
        role: UserRole.USER,
      });

      await userRepo.save(user);
      console.log("✅ User created");
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
        console.log(`✅ Product ${data.title} created`);
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
      console.log("✅ Order created");
    } else {
      order = existingOrder;
      console.log("ℹ️ Order already exists");
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

      console.log("✅ Order items created");
    } else {
      console.log("ℹ️ Order items already exist");
    }

    await queryRunner.commitTransaction();
    console.log("🎉 Seeding finished successfully");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

seed();
