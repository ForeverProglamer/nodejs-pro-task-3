import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { getRepositoryToken } from "@nestjs/typeorm";
import Product from "src/products/product.entity";
import { Repository } from "typeorm";
import { CreateOrderDto } from "src/orders/create-order.dto";
import LogInDto from "src/auth/dtos/log-in.dto";
import { USER_EMAIL, USER_PASS } from "src/seed/constants";
import { randomUUID } from "crypto";
import ProductResponseDto from "src/products/product-response.dto";

async function waitFor(
  fn: () => Promise<void>,
  {
    timeout = 5000,
    interval = 200,
  }: { timeout?: number; interval?: number } = {},
) {
  const start = Date.now();

  while (true) {
    try {
      await fn();
      return; // success
    } catch (err) {
      if (Date.now() - start > timeout) {
        throw err; // rethrow last error
      }
      await new Promise((res) => setTimeout(res, interval));
    }
  }
}

describe("App (e2e)", () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication["getHttpServer"]>;
  let accessToken: string;
  let productsRepo: Repository<Product>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    server = app.getHttpServer();

    const loginDto: LogInDto = {
      email: USER_EMAIL,
      password: USER_PASS,
    };
    const loginResp = await request(server).post("/auth/login").send(loginDto);

    expect(loginResp.status).toEqual(200);
    expect(loginResp.body.accessToken).toBeDefined();
    accessToken = loginResp.body.accessToken;

    productsRepo = await app.resolve(getRepositoryToken(Product));
  });

  afterAll(async () => {
    await app?.close();
  });

  const createProduct = (override: Partial<Product>): Promise<Product> => {
    return productsRepo.save({
      title: "Laptop",
      description: "Seemingly useful thing",
      stock: 5,
      price: "500",
      ...override,
    });
  };

  it("GET /health -> 200", async () => {
    return request(server).get("/health").expect(200);
  });

  it("POST /orders -> 201, then GET /products/:id -> stock decreased, and GET /orders/:id -> 200", async () => {
    const products = await Promise.all([
      createProduct({ title: "Mouse", stock: 10 }),
      createProduct({ title: "Keyboard", stock: 10 }),
    ]);
    const dto: CreateOrderDto = {
      items: products.map((p) => ({ id: p.id, qty: 1 })),
    };

    // POST /orders
    const response = await request(server)
      .post("/orders")
      .send(dto)
      .set("Idempotency-Key", randomUUID())
      .auth(accessToken, { type: "bearer" });

    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.status).toEqual(201);
    expect(response.body.status).toEqual("created");
    expect(response.body.items).toHaveLength(dto.items.length);
    expect(response.body.id).toBeDefined();

    // GET /products/:id
    const responses = await Promise.all(
      products.map((p) => request(server).get(`/products/${p.id}`)),
    );
    expect(responses.every((r) => r.ok)).toEqual(true);
    const updatedProducts: ProductResponseDto[] = responses.map((r) => r.body);
    updatedProducts.forEach((product, i) => {
      expect(product.stock).toBe(products[i].stock - 1);
    });

    // GET /orders/:id
    // Wait for background order processing
    await waitFor(async () => {
      const res = await request(server)
        .get(`/orders/${response.body.id}`)
        .auth(accessToken, { type: "bearer" });

      expect(res.status).toEqual(200);
      expect(res.body.id).toEqual(response.body.id);
      expect(res.body.status).toEqual("processed");
    });
  });
});
