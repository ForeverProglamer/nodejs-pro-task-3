import { UUID } from "crypto";

export class ProcessOrderMessageDto {
  messageId: UUID;
  orderId: UUID;
  createdAt: Date;
  attempt: number;

  constructor(messageId: UUID, orderId: UUID, attempt: number = 1) {
    this.messageId = messageId;
    this.orderId = orderId;
    this.createdAt = new Date();
    this.attempt = attempt;
  }
}
