import { Test, TestingModule } from "@nestjs/testing";
import { RabbitMqService } from "./rabbit-mq.service";
import { ConfigModule } from "@nestjs/config";
import { MetricsService } from "src/metrics/metrics.service";

describe("RabbitMqService", () => {
  let service: RabbitMqService;
  const metricsServiceMock = {
    incrementRabbitMqMessagePublished: jest.fn(),
    incrementRabbitMqMessageConsumed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [
        RabbitMqService,
        {
          provide: MetricsService,
          useValue: metricsServiceMock,
        },
      ],
    }).compile();

    service = module.get<RabbitMqService>(RabbitMqService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
