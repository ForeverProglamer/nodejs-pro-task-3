import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";
import { ProcessOrderMessageDto } from "./order-processed-message.dto";

@Injectable()
export class OrdersWorkerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrdersWorkerService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly rabbitmq: RabbitMqService,
  ) {}

  async onApplicationBootstrap() {
    await this.rabbitmq.consume("orders.process", this.handle.bind(this));
    this.logger.log(`Worker has been initialized`);
  }

  async handle(msg: ProcessOrderMessageDto, ack: VoidFunction) {
    this.logger.log(`Received a message ${msg}`);

    await this.ordersService.processOrderMessage(msg.orderId);
    ack();

    this.logger.log(`Message has been processed ${msg}`);
  }
}
