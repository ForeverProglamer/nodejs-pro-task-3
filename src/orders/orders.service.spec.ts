import { Test, TestingModule } from "@nestjs/testing";
import { OrdersService } from "./orders.service";
import { RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";
import { UNIT_OF_WORK } from "src/common/unit-of-work";
import { ORDERS_REPOSITORY } from "./orders.repository";

describe("OrdersService", () => {
  let service: OrdersService;
  const uowMock = {
    transaction: jest.fn(),
  };
  const ordersRepoMock = {};
  const rabbitMqServiceMock = {
    send: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: UNIT_OF_WORK,
          useValue: uowMock,
        },
        {
          provide: ORDERS_REPOSITORY,
          useValue: ordersRepoMock,
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
