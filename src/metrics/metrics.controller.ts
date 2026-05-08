import { Controller, Get, Header } from "@nestjs/common";
import { MetricsService } from "./metrics.service";
import { Public } from "src/auth/decorators";

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get("metrics")
  @Public()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async metrics() {
    return this.metricsService.getMetricsText();
  }
}
