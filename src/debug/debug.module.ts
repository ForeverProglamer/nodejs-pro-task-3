import { Module } from "@nestjs/common";
import { DebugController } from "./debug.controller";
import { RabbitMqModule } from "src/rabbit-mq/rabbit-mq.module";

@Module({
  controllers: [DebugController],
  imports: [RabbitMqModule],
})
export class DebugModule {}
