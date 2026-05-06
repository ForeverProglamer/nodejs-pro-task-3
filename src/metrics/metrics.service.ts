import { Injectable } from "@nestjs/common";
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export type OrderCreateResult =
  | "success"
  | "duplicate"
  | "product_not_found"
  | "not_enough_stock"
  | "error";

export type OrderProcessResult =
  | "success"
  | "duplicate"
  | "retry"
  | "dlq"
  | "error";

export type MessageResult = "success" | "error";

@Injectable()
export class MetricsService {
  readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDurationSeconds: Histogram<string>;
  private readonly ordersCreatedTotal: Counter<string>;
  private readonly ordersProcessedTotal: Counter<string>;
  private readonly orderProcessingDurationSeconds: Histogram<string>;
  private readonly orderProcessingRetriesTotal: Counter<string>;
  private readonly rabbitmqMessagesPublishedTotal: Counter<string>;
  private readonly rabbitmqMessagesConsumedTotal: Counter<string>;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry, prefix: "ecomm_" });

    this.httpRequestsTotal = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status"],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: "http_request_duration_seconds",
      help: "HTTP request duration in seconds",
      labelNames: ["method", "route", "status"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.3, 1, 3],
      registers: [this.registry],
    });

    this.ordersCreatedTotal = new Counter({
      name: "orders_created_total",
      help: "Total order creation attempts by result",
      labelNames: ["result"],
      registers: [this.registry],
    });

    this.ordersProcessedTotal = new Counter({
      name: "orders_processed_total",
      help: "Total order processing attempts by result",
      labelNames: ["result"],
      registers: [this.registry],
    });

    this.orderProcessingDurationSeconds = new Histogram({
      name: "order_processing_duration_seconds",
      help: "Time between message creation and final order processing result",
      labelNames: ["result"],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.orderProcessingRetriesTotal = new Counter({
      name: "order_processing_retries_total",
      help: "Total order processing retries scheduled by the worker",
      registers: [this.registry],
    });

    this.rabbitmqMessagesPublishedTotal = new Counter({
      name: "rabbitmq_messages_published_total",
      help: "Total RabbitMQ messages published by the application",
      labelNames: ["queue", "result"],
      registers: [this.registry],
    });

    this.rabbitmqMessagesConsumedTotal = new Counter({
      name: "rabbitmq_messages_consumed_total",
      help: "Total RabbitMQ messages consumed by the application",
      labelNames: ["queue", "result"],
      registers: [this.registry],
    });
  }

  observeHttpRequest(
    method: string,
    route: string,
    status: number,
    durationMs: number,
  ) {
    const statusLabel = String(status);
    this.httpRequestsTotal.inc({ method, route, status: statusLabel });
    this.httpRequestDurationSeconds.observe(
      { method, route, status: statusLabel },
      durationMs / 1000,
    );
  }

  incrementOrderCreated(result: OrderCreateResult) {
    this.ordersCreatedTotal.inc({ result });
  }

  incrementOrderProcessed(result: OrderProcessResult) {
    this.ordersProcessedTotal.inc({ result });
  }

  observeOrderProcessing(result: OrderProcessResult, durationMs: number) {
    this.orderProcessingDurationSeconds.observe(
      { result },
      durationMs / 1000,
    );
  }

  incrementOrderProcessingRetry() {
    this.orderProcessingRetriesTotal.inc();
  }

  incrementRabbitMqMessagePublished(queue: string, result: MessageResult) {
    this.rabbitmqMessagesPublishedTotal.inc({ queue, result });
  }

  incrementRabbitMqMessageConsumed(queue: string, result: MessageResult) {
    this.rabbitmqMessagesConsumedTotal.inc({ queue, result });
  }

  async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }
}
