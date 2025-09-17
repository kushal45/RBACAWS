import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserTypeEnum1758119285712 implements MigrationInterface {
  name = 'UpdateUserTypeEnum1758119285712';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "is_system_admin" TO "user_type"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "user_type"`);
    await queryRunner.query(
      `CREATE TYPE "public"."users_user_type_enum" AS ENUM('system_admin', 'tenant_admin', 'regular_user', 'service_account')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "user_type" "public"."users_user_type_enum" NOT NULL DEFAULT 'regular_user'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "user_type"`);
    await queryRunner.query(`DROP TYPE "public"."users_user_type_enum"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "user_type" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "user_type" TO "is_system_admin"`);
  }
}
