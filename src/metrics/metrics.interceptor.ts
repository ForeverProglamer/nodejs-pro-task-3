import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";
import { DomainError } from "src/common/errors";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();

    const startedAt = process.hrtime.bigint();

    const recordMetrics = (error?: unknown) => {
      const finishedAt = process.hrtime.bigint();
      const durationMs = Number(finishedAt - startedAt) / 1_000_000;

      // Determine Route: prioritize the parameterized path
      const route = request.route?.path || request.url || "unknown";

      let status: number;
      if (error instanceof HttpException) {
        status = error.getStatus();
      } else if (error instanceof DomainError) {
        status = error.httpStatus;
      } else if (error) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      } else {
        status = response.statusCode;
      }

      this.metricsService.observeHttpRequest(
        request.method,
        route,
        status,
        durationMs,
      );
    };

    return next.handle().pipe(
      tap(() => recordMetrics()),
      catchError((err) => {
        recordMetrics(err);
        return throwError(() => err); // Re-throw so Nest can handle the response
      }),
    );
  }
}
