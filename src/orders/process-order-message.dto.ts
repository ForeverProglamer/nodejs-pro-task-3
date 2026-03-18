import { UUID } from "crypto";

export class Failure {
  constructor(
    public reason: string,
    public stopOnAttempt?: number,
  ) {}
}

export class ProcessOrderMessageDto {
  messageId: UUID;
  orderId: UUID;
  createdAt: Date;
  attempt: number;

  // Debug-only
  simulateFailure?: Failure;

  constructor(
    messageId: UUID,
    orderId: UUID,
    attempt: number = 1,
    simulateFailure?: Failure,
  ) {
    this.messageId = messageId;
    this.orderId = orderId;
    this.createdAt = new Date();
    this.attempt = attempt;

    this.simulateFailure = simulateFailure;
  }
}
