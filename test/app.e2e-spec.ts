import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { getRepositoryToken } from "@nestjs/typeorm";
import Product from "src/products/product.entity";
import { In, Repository } from "typeorm";
import { CreateOrderDto } from "src/orders/create-order.dto";
import LogInDto from "src/auth/dtos/log-in.dto";
import { USER_EMAIL, USER_PASS } from "src/seed/constants";
import { randomUUID } from "crypto";

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
  let server: any;
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
    await app.close();
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
    return request(app.getHttpServer()).get("/health").expect(200);
  });

  it("POST /orders -> 201, then GET /orders/:id -> 200", async () => {
    const [product1, product2] = await Promise.all([
      createProduct({ title: "Mouse", stock: 10 }),
      createProduct({ title: "Keyboard", stock: 10 }),
    ]);
    const dto: CreateOrderDto = {
      items: [
        { id: product1.id, qty: 1 },
        { id: product2.id, qty: 1 },
      ],
    };

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

    // TODO: use products backend API instead of repository
    const updatedProducts = await productsRepo.findBy({
      id: In([product1.id, product2.id]),
    });
    expect(updatedProducts.length).toEqual(dto.items.length);
    expect(updatedProducts[0].stock).toEqual(product1.stock - 1);
    expect(updatedProducts[1].stock).toEqual(product2.stock - 1);

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
