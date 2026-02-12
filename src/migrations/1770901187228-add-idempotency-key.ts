import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIdempotencyKey1770901187228 implements MigrationInterface {
  name = "AddIdempotencyKey1770901187228";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "orders"
        ADD "idempotency_key" uuid
    `);
    await queryRunner.query(`
        UPDATE "orders" SET "idempotency_key" = gen_random_uuid()
        WHERE "idempotency_key" IS NULL
    `);
    await queryRunner.query(`
        ALTER TABLE "orders"
        ALTER COLUMN "idempotency_key" SET NOT NULL
    `);
    await queryRunner.query(`
        ALTER TABLE "orders"
        ADD CONSTRAINT "UQ_orders_user_id_idempotency_key" UNIQUE ("user_id", "idempotency_key")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_user_id_idempotency_key"
    `);
    await queryRunner.query(`
        ALTER TABLE "orders" DROP COLUMN "idempotency_key"
    `);
  }
}
