import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

declare module "express" {
  interface Request {
    correlationId?: string;
  }
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header("x-correlation-id");
    const id = incoming && incoming.trim().length > 0 ? incoming : uuidv4();
    req.correlationId = id;
    res.setHeader("x-correlation-id", id);
    next();
  }
}
