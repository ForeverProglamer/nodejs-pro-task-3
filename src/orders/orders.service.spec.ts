import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "./orders.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import Order from "./order.entity";
import { RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";

describe("OrdersService", () => {
  let service: OrdersService;
  const orderRepositoryMock = {};
  const dataSourceMock = {
    transaction: jest.fn(),
  };
  const rabbitMqServiceMock = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepositoryMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: RabbitMqService,
          useValue: rabbitMqServiceMock,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
