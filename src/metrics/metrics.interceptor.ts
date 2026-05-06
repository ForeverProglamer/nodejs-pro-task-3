import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{ method: string; route?: { path?: string }; path?: string }>();
    const response = http.getResponse<{ statusCode: number }>();

    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      tap({
        next: () => {
          const finishedAt = process.hrtime.bigint();
          const durationMs = Number(finishedAt - startedAt) / 1_000_000;
          const route = request.route?.path ?? request.path ?? 'unknown';
          this.metricsService.observeHttpRequest(
            request.method,
            route,
            response.statusCode,
            durationMs
          );
        }
      })
    );
  }
}
