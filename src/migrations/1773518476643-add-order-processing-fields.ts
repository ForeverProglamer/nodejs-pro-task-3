import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOrderProcessingFields1773518476643
  implements MigrationInterface
{
  name = "AddOrderProcessingFields1773518476643";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "orders"
            ADD "processed_at" TIMESTAMP WITH TIME ZONE
        `);
    await queryRunner.query(`
            DROP INDEX "public"."IX_orders_user_id_status_created_at"
        `);
    await queryRunner.query(`
            ALTER TYPE "public"."orders_status_enum"
            RENAME TO "orders_status_enum_old"
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."orders_status_enum" AS ENUM('created', 'canceled', 'processed', 'paid')
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "status" DROP DEFAULT
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::"text"::"public"."orders_status_enum"
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "status"
            SET DEFAULT 'created'
        `);
    await queryRunner.query(`
            DROP TYPE "public"."orders_status_enum_old"
        `);
    await queryRunner.query(`
            CREATE INDEX "IX_orders_user_id_status_created_at" ON "orders" ("user_id", "status", "created_at" DESC)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IX_orders_user_id_status_created_at"
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."orders_status_enum_old" AS ENUM('created', 'canceled', 'paid')
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "status" DROP DEFAULT
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "status" TYPE "public"."orders_status_enum_old" USING "status"::"text"::"public"."orders_status_enum_old"
        `);
    await queryRunner.query(`
            ALTER TABLE "orders"
            ALTER COLUMN "status"
            SET DEFAULT 'created'
        `);
    await queryRunner.query(`
            DROP TYPE "public"."orders_status_enum"
        `);
    await queryRunner.query(`
            ALTER TYPE "public"."orders_status_enum_old"
            RENAME TO "orders_status_enum"
        `);
    await queryRunner.query(`
            CREATE INDEX "IX_orders_user_id_status_created_at" ON "orders" ("user_id", "status", "created_at" DESC)
        `);
    await queryRunner.query(`
            ALTER TABLE "orders" DROP COLUMN "processed_at"
        `);
  }
}
