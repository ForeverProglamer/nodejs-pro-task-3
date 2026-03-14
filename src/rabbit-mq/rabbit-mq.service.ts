import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Channel, ChannelModel } from "amqplib";
import * as amqplib from "amqplib";

@Injectable()
export class RabbitMqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(RabbitMqService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;

  constructor(private readonly configService: ConfigService) {}

  getChannel() {
    if (!this.channel) throw new Error("Channel is not created!");
    return this.channel;
  }

  getConfig() {
    return {
      url: this.configService.getOrThrow<string>("RABBITMQ_URL"),
      prefetch: Number(
        this.configService.get<string>("RABBITMQ_PREFETCH") || "10",
      ),
    };
  }

  async onModuleInit() {
    const config = this.getConfig();
    this.connection = await amqplib.connect(config.url);
    this.channel = await this.connection.createChannel();
    await this.channel.prefetch(config.prefetch);
    await this.assertInfra();
    this.logger.log("RabbitMq was successfully initialized");
  }

  async assertInfra() {
    const channel = this.getChannel();
    await channel.assertQueue("orders.process", { durable: true });
    await channel.assertQueue("orders.dlq", { durable: true });
  }

  async onModuleDestroy() {
    try {
      await this.channel?.close();
    } finally {
      await this.connection?.close();
      this.logger.log("RabbitMq connection was closed");
    }
  }

  send(queue: string, message: Record<string, any>): boolean {
    return this.getChannel().sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true },
    );
  }
}
