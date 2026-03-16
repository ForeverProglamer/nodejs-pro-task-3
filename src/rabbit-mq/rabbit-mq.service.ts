import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Channel, ChannelModel } from "amqplib";
import * as amqplib from "amqplib";

export type Message = Record<string, any> & {
  messageId: string;
};

export type AckCallback = () => void;

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

  send(queue: string, message: Message): boolean {
    return this.getChannel().sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true, messageId: message.messageId },
    );
  }

  async consume<T extends Message>(
    queue: string,
    handler: (msg: T, ack: AckCallback) => Promise<void>,
  ) {
    const channel = this.getChannel();
    await channel.consume(
      queue,
      async (msg) => {
        if (!msg) return;
        try {
          const message = JSON.parse(msg.content.toString());
          await handler(message, () => channel.ack(msg, false));
        } catch (error) {
          this.logger.error(
            `Unhandled worker error in queue '${queue}': ${error.stack}`,
          );
          try {
            channel.reject(msg, true);
          } catch {}
        }
      },
      { noAck: false },
    );
  }
}
