import { Injectable } from "@nestjs/common";
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

@Injectable()
export class MetricsService {
  readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<string>;
  private readonly httpRequestDurationSeconds: Histogram<string>;
  private readonly providerRequestsTotal: Counter<string>;
  private readonly providerRequestDurationSeconds: Histogram<string>;
  private readonly paymentRetriesTotal: Counter<string>;
  private readonly queueDepthGauge: Gauge<string>;
  private readonly queueInFlightGauge: Gauge<string>;

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

    this.providerRequestsTotal = new Counter({
      name: "provider_requests_total",
      help: "Total provider API requests",
      labelNames: ["provider", "status"],
      registers: [this.registry],
    });

    this.providerRequestDurationSeconds = new Histogram({
      name: "provider_request_duration_seconds",
      help: "Provider API latency in seconds",
      labelNames: ["provider", "status"],
      buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.paymentRetriesTotal = new Counter({
      name: "payment_retries_total",
      help: "Retry count for provider requests",
      labelNames: ["provider"],
      registers: [this.registry],
    });

    this.queueDepthGauge = new Gauge({
      name: "queue_depth",
      help: "Current queue depth",
      labelNames: ["queue"],
      registers: [this.registry],
    });

    this.queueInFlightGauge = new Gauge({
      name: "queue_in_flight",
      help: "Current queue in-flight jobs",
      labelNames: ["queue"],
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

  startProviderTimer(provider: string): (status: "ok" | "error") => void {
    const end = this.providerRequestDurationSeconds.startTimer({
      provider,
      status: "ok",
    });

    return (status: "ok" | "error") => {
      end({ provider, status });
      this.providerRequestsTotal.inc({ provider, status });
    };
  }

  incrementRetry(provider: string) {
    this.paymentRetriesTotal.inc({ provider });
  }

  setQueueDepth(queue: string, value: number) {
    this.queueDepthGauge.set({ queue }, value);
  }

  setQueueInFlight(queue: string, value: number) {
    this.queueInFlightGauge.set({ queue }, value);
  }

  async getMetricsText(): Promise<string> {
    return this.registry.metrics();
  }
}
