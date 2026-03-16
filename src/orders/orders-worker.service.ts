import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { AckCallback, RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";
import { ProcessOrderMessageDto } from "./order-processed-message.dto";
import { ConfigService } from "@nestjs/config";
import { parseBoolean } from "src/common/utils";

@Injectable()
export class OrdersWorkerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrdersWorkerService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly rabbitmq: RabbitMqService,
    private readonly configService: ConfigService,
  ) {}

  getConfig() {
    return {
      enableWorker: parseBoolean(
        this.configService.get("WORKER_ENABLE") || "false",
      ),
      maxRetries: Number(this.configService.get("WORKER_RETRIES") || "3"),
      backoffSeconds: Number(this.configService.get("WORKER_BACKOFF_S") || "5"),
    };
  }

  async onApplicationBootstrap() {
    const { enableWorker } = this.getConfig();
    if (!enableWorker) return;
    await this.rabbitmq.consume("orders.process", this.handle.bind(this));
    this.logger.log(`Worker has been initialized`);
  }

  async handle(msg: ProcessOrderMessageDto, ack: AckCallback) {
    this.logger.log(`Received a message ${msg}`);

    await this.ordersService.processOrderMessage(msg.orderId);
    ack();

    this.logger.log(`Message has been processed ${msg}`);
  }
}
