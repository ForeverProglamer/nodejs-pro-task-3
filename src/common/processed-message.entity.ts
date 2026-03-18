import { UUID } from "crypto";

import { Entity, Column, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("processed_messages")
@Unique("UQ_processed_messages_message_id_handler", ["messageId", "handler"])
export default class ProcessedMessage {
  @PrimaryGeneratedColumn("uuid", {
    primaryKeyConstraintName: "PK_processed_messages_id",
  })
  id: UUID;

  @Column({ name: "message_id", type: "uuid", nullable: false })
  messageId: UUID;

  @Column({ type: "varchar", nullable: false })
  handler: string;

  @Column({
    name: "processed_at",
    type: "timestamptz",
    utc: true,
    nullable: false,
    default: () => "CURRENT_TIMESTAMP",
  })
  processedAt: Date;
}
