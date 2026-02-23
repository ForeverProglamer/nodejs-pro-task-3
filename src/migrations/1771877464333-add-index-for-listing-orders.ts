import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexForListingOrders1771877464333
  implements MigrationInterface
{
  name = "AddIndexForListingOrders1771877464333";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE INDEX "IX_orders_user_id_status_created_at" ON "orders" ("user_id", "status", "created_at" DESC)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DROP INDEX "public"."IX_orders_user_id_status_created_at"
        `);
  }
}
