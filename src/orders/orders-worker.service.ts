import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { AckCallback, RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";
import { ProcessOrderMessageDto } from "./process-order-message.dto";
import { ConfigService } from "@nestjs/config";
import { parseBoolean, sleep } from "src/common/utils";
import { DataSource, EntityManager } from "typeorm";
import ProcessedMessage from "src/common/processed-message.entity";
import Order, { OrderStatus } from "./order.entity";
import {
  MetricsService,
  OrderProcessResult,
} from "src/metrics/metrics.service";

@Injectable()
export class OrdersWorkerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrdersWorkerService.name);

  constructor(
    private readonly rabbitmq: RabbitMqService,
    private readonly configService: ConfigService,
    private readonly datasource: DataSource,
    private readonly metricsService: MetricsService,
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
    const startedAt = Date.now();
    this.logger.log(
      `Received a message '${msg.messageId}' attempt=${msg.attempt}`,
      msg,
    );

    try {
      const result = await this.handleHappyPath(msg, ack);
      this.metricsService.observeOrderProcessing(
        result,
        Date.now() - startedAt,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process message '${msg.messageId}' attempt=${msg.attempt} due to ${error.stack}`,
        msg,
      );
      this.handleFailedProcessing(msg, ack);
      this.metricsService.observeOrderProcessing(
        "error",
        Date.now() - startedAt,
      );
      return;
    }
  }

  protected async handleHappyPath(
    msg: ProcessOrderMessageDto,
    ack: AckCallback,
  ): Promise<OrderProcessResult> {
    const isProcessed = await this.datasource.transaction(async (manager) => {
      const dedupRepo = manager.getRepository(ProcessedMessage);
      try {
        await dedupRepo.insert({
          messageId: msg.messageId,
          handler: OrdersWorkerService.name,
        });
      } catch (err) {
        if (String(err?.code) === "23505") {
          this.logger.debug(
            `Duplicate delivery of message '${msg.messageId}' ` +
              `attempt=${msg.attempt} detected`,
            msg,
          );
          return false;
        }
        this.logger.error(
          `Failed to insert dedup record: ${err?.stack ?? err}`,
        );
        throw err;
      }
      await this.processOrderMessage(msg, manager);
      return true;
    });

    ack();

    if (isProcessed) {
      this.metricsService.incrementOrderProcessed("success");
      this.logger.log(
        `Message '${msg.messageId}' attempt=${msg.attempt} has been processed`,
        msg,
      );
      return "success";
    } else {
      this.metricsService.incrementOrderProcessed("duplicate");
      return "duplicate";
    }
  }

  protected async processOrderMessage(
    msg: ProcessOrderMessageDto,
    manager: EntityManager,
  ) {
    await sleep(2);
    if (msg.simulateFailure) {
      // Debug-only
      const { reason, stopOnAttempt } = msg.simulateFailure;
      if (stopOnAttempt === msg.attempt) return;
      throw new Error(reason);
    }
    const ordersRepo = manager.getRepository(Order);
    const { orderId } = msg;
    await ordersRepo.update(
      { id: orderId },
      { id: orderId, status: OrderStatus.PROCESSED, processedAt: new Date() },
    );
  }

  protected handleFailedProcessing(
    msg: ProcessOrderMessageDto,
    ack: AckCallback,
  ) {
    const { maxRetries, backoffSeconds } = this.getConfig();

    if (msg.attempt >= maxRetries) {
      this.logger.log(`Message '${msg.messageId}' is sent to DLQ`);
      this.metricsService.incrementOrderProcessed("dlq");
      this.rabbitmq.send("orders.dlq", msg);
      ack();
      return;
    }

    this.metricsService.incrementOrderProcessed("retry");
    this.metricsService.incrementOrderProcessingRetry();
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
