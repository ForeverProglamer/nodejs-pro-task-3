import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HttpLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(
      `${req.ip} ${req.method} ${req.originalUrl} ${JSON.stringify(req.headers)}`,
    );
    next();
  }
}
