import { Test, TestingModule } from "@nestjs/testing";
import { OrdersWorkerService } from "./orders-worker.service";
import { OrdersService } from "./orders.service";
import { RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { MetricsService } from "src/metrics/metrics.service";

describe("OrdersWorkerService", () => {
  let service: OrdersWorkerService;
  const ordersServiceMock = {
    processOrderMessage: jest.fn(),
  };
  const rabbitMqServiceMock = {
    consume: jest.fn(),
    send: jest.fn(),
  };
  const configServiceMock = {
    get: jest.fn(),
  };
  const dataSourceMock = {
    transaction: jest.fn(),
  };
  const metricsServiceMock = {
    incrementOrderProcessed: jest.fn(),
    incrementOrderProcessingRetry: jest.fn(),
    observeOrderProcessing: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersWorkerService,
        {
          provide: OrdersService,
          useValue: ordersServiceMock,
        },
        {
          provide: RabbitMqService,
          useValue: rabbitMqServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: MetricsService,
          useValue: metricsServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrdersWorkerService>(OrdersWorkerService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
