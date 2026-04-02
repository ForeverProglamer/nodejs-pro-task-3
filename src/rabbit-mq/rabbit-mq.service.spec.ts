import { Test, TestingModule } from "@nestjs/testing";
import { RabbitMqService } from "./rabbit-mq.service";
import { ConfigModule } from "@nestjs/config";

describe("RabbitMqService", () => {
  let service: RabbitMqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [RabbitMqService],
    }).compile();

    service = module.get<RabbitMqService>(RabbitMqService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
