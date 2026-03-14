import { Test, TestingModule } from "@nestjs/testing";
import { OrdersWorkerService } from "./orders-worker.service";

describe("OrdersWorkerService", () => {
  let service: OrdersWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersWorkerService],
    }).compile();

    service = module.get<OrdersWorkerService>(OrdersWorkerService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
