import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProcessedMessagesTable1773758211678 implements MigrationInterface {
    name = 'AddProcessedMessagesTable1773758211678'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "processed_messages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "message_id" uuid NOT NULL,
                "handler" character varying NOT NULL,
                "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_processed_messages_message_id_handler" UNIQUE ("message_id", "handler"),
                CONSTRAINT "PK_processed_messages_id" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "processed_messages"
        `);
    }

}
