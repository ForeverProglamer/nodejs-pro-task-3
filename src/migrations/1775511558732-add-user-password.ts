import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserPassword1775511558732 implements MigrationInterface {
    name = 'AddUserPassword1775511558732'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD "password" character varying(100) NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users" DROP COLUMN "password"
        `);
    }

}
