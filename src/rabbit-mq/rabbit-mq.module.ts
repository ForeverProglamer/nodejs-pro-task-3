import { Module } from "@nestjs/common";
import { RabbitMqService } from "./rabbit-mq.service";
import { MetricsModule } from "src/metrics/metrics.module";

@Module({
  imports: [MetricsModule],
  providers: [RabbitMqService],
  exports: [RabbitMqService],
})
export class RabbitMqModule {}
