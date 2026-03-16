import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { AckCallback, RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";
import { ProcessOrderMessageDto } from "./process-order-message.dto";
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

  protected async handle(msg: ProcessOrderMessageDto, ack: AckCallback) {
    this.logger.log(
      `Received a message '${msg.messageId}' attempt=${msg.attempt}`,
      msg,
    );

    try {
      await this.ordersService.processOrderMessage(msg);
      ack();
    } catch (error) {
      this.logger.error(
        `Failed to process message '${msg.messageId}' attempt=${msg.attempt} due to ${error.stack}`,
        msg,
      );
      this.handleFailedProcessing(msg, ack);
      return;
    }

    this.logger.log(
      `Message '${msg.messageId}' attempt=${msg.attempt} has been processed`,
      msg,
    );
  }

  protected handleFailedProcessing(
    msg: ProcessOrderMessageDto,
    ack: AckCallback,
  ) {
    const { maxRetries, backoffSeconds } = this.getConfig();

    if (msg.attempt >= maxRetries) {
      this.logger.log(`Message '${msg.messageId}' is sent to DLQ`);
      this.rabbitmq.send("orders.dlq", msg);
      ack();
      return;
    }

    this.logger.log(
      `Scheduling message '${msg.messageId}' retry after ${backoffSeconds} seconds`,
    );
    setTimeout(() => {
      this.rabbitmq.send("orders.process", {
        ...msg,
        attempt: msg.attempt + 1,
      });
      ack();
      this.logger.log(
        `Message '${msg.messageId}' was posted to queue for retry`,
      );
    }, backoffSeconds * 1000);
  }
}
