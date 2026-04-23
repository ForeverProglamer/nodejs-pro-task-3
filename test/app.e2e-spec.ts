import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";
import { getRepositoryToken } from "@nestjs/typeorm";
import Product from "src/products/product.entity";
import { DataSource, Repository } from "typeorm";
import { CreateOrderDto } from "src/orders/create-order.dto";
import LogInDto from "src/auth/dtos/log-in.dto";
import { USER_EMAIL, USER_PASS } from "src/seed/constants";
import { randomUUID } from "crypto";
import ProductResponseDto from "src/products/product-response.dto";
import seed from "src/seed";
import { Server } from "http";
import { HttpExceptionFilter } from "src/common/http-exception.filter";
import * as cookieParser from "cookie-parser";

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

const cleanDatabase = async (dataSource: DataSource) => {
  const entities = dataSource.entityMetadatas;
  for (const entity of entities) {
    const repo = dataSource.getRepository(entity.name);
    await repo.query(`TRUNCATE "${entity.tableName}" RESTART IDENTITY CASCADE`);
  }
};

const authenticate = async (server: Server) => {
  const loginDto: LogInDto = {
    email: USER_EMAIL,
    password: USER_PASS,
  };
  const loginResp = await request(server).post("/auth/login").send(loginDto);

  expect(loginResp.status).toEqual(200);
  expect(loginResp.body.accessToken).toBeDefined();
  return loginResp.body.accessToken;
};

describe("App (e2e)", () => {
  let app: INestApplication;
  let server: Server;
  let accessToken: string;
  let productsRepo: Repository<Product>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    app.use(cookieParser());

    await app.init();
    server = app.getHttpServer();

    accessToken = await authenticate(server);
    productsRepo = await app.resolve(getRepositoryToken(Product));
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    const ds = app.get(DataSource);
    await cleanDatabase(ds);
    await seed({ ds });
    accessToken = await authenticate(server);
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

  it("POST /orders multiple submission = 1 order, then GET /products/:id -> stock decreased only once", async () => {
    const products = await Promise.all([
      createProduct({ title: "Product 1", stock: 3 }),
      createProduct({ title: "Product 2", stock: 6 }),
    ]);
    const dto: CreateOrderDto = {
      items: products.map((p) => ({ id: p.id, qty: 1 })),
    };

    // POST /orders
    const submitOrder = async (token: string, idempotencyKey: string) => {
      return await request(server)
        .post("/orders")
        .send(dto)
        .set("Idempotency-Key", idempotencyKey)
        .auth(token, { type: "bearer" });
    };

    const idempotencyKey = randomUUID();
    const doubleSubmission = await Promise.all([
      submitOrder(accessToken, idempotencyKey),
      submitOrder(accessToken, idempotencyKey),
    ]);

    doubleSubmission.forEach((response) => {
      expect(response.headers["content-type"]).toMatch(/json/);
      expect(response.status).toEqual(201);

      expect(response.body.items).toHaveLength(dto.items.length);
      expect(response.body.status).toEqual("created");
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    expect(doubleSubmission[0].body.id).toEqual(doubleSubmission[1].body.id);
    expect(doubleSubmission[0].body.createdAt).toEqual(
      doubleSubmission[1].body.createdAt,
    );

    // GET /products/:id
    const responses = await Promise.all(
      products.map((p) => request(server).get(`/products/${p.id}`)),
    );
    expect(responses.every((r) => r.ok)).toEqual(true);
    const updatedProducts: ProductResponseDto[] = responses.map((r) => r.body);
    updatedProducts.forEach((product, i) => {
      expect(product.stock).toBe(products[i].stock - 1);
    });
  });

  it("POST /orders fails if not enough items in stock", async () => {
    const [common, exclusive] = await Promise.all([
      createProduct({ title: "Common product", stock: 100 }),
      createProduct({ title: "Exclusive product", stock: 5 }),
    ]);
    const dto: CreateOrderDto = {
      items: [common, exclusive].map((p) => ({ id: p.id, qty: 10 })),
    };

    const response = await request(server)
      .post("/orders")
      .send(dto)
      .set("Idempotency-Key", randomUUID())
      .auth(accessToken, { type: "bearer" });

    expect(response.headers["content-type"]).toMatch(/json/);
    expect(response.status).toEqual(409);
    expect(response.body.code).toEqual("NOT_ENOUGH_ITEMS_IN_STOCK");
    expect(response.body.details).toMatchObject({
      productId: exclusive.id,
      askedQty: 10,
      stock: exclusive.stock,
    });
  });

  it("POST /orders fails with bad data", async () => {
    const nonExistingProductId = randomUUID();
    const dto: CreateOrderDto = {
      items: [{ id: nonExistingProductId, qty: 1 }],
    };

    const badResponse1 = await request(server)
      .post("/orders")
      .send(dto)
      .auth(accessToken, { type: "bearer" });

    expect(badResponse1.headers["content-type"]).toMatch(/json/);
    expect(badResponse1.status).toEqual(400);
    expect(badResponse1.body.code).toEqual("REQUEST_FAILED");
    expect(badResponse1.body.message).toMatch(/Idempotency-Key/);

    const badResponse2 = await request(server)
      .post("/orders")
      .send(dto)
      .set("Idempotency-Key", randomUUID())
      .auth(accessToken, { type: "bearer" });

    expect(badResponse2.headers["content-type"]).toMatch(/json/);
    expect(badResponse2.status).toEqual(404);
    expect(badResponse2.body.code).toEqual("CANNOT_FIND_PRODUCTS");
    expect(badResponse2.body.details).toMatchObject({
      missingProductsCount: 1,
    });
  });
});
