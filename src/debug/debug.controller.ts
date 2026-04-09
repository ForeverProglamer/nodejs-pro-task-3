import { Body, Controller, Logger, Post } from "@nestjs/common";
import { Roles } from "src/auth/decorators";
import { ProcessOrderMessageDto } from "src/orders/process-order-message.dto";
import { RabbitMqService } from "src/rabbit-mq/rabbit-mq.service";

@Controller("debug")
export class DebugController {
  private readonly logger: Logger = new Logger(DebugController.name);

  constructor(private readonly rabbitmq: RabbitMqService) {}

  @Roles("admin")
  @Post("orders/process")
  processOrder(@Body() message: ProcessOrderMessageDto) {
    this.logger.log("Received a message", message);
    this.rabbitmq.send("orders.process", message);
    return { ok: true };
  }
}
