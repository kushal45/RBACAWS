import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAuthSchema1758118733259 implements MigrationInterface {
  name = 'InitialAuthSchema1758118733259';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_c58f7e88c286e5e3478960a998b"`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_472b25323af01488f1f66a06b67"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_86033897c009fcca8b6505d6be2"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_c58f7e88c286e5e3478960a998"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_79c1ec9a4dcf46670d495664a3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7346b08032078107fce81e014f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_472b25323af01488f1f66a06b6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_86033897c009fcca8b6505d6be"`);
    await queryRunner.query(
      `CREATE TYPE "public"."auth_tokens_token_type_enum" AS ENUM('invitation', 'activation', 'password_reset', 'refresh', 'two_factor')`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_type" "public"."auth_tokens_token_type_enum" NOT NULL, "token_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "used_at" TIMESTAMP, "revoked_at" TIMESTAMP, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_41e9ddfbb32da18c4e85e45c2fd" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8bc26f37312d1b86ce1e45bea" ON "auth_tokens" ("user_id", "token_type") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3a94cfa1eada85ac2bf6f3016b" ON "auth_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."auth_credentials_status_enum" AS ENUM('pending', 'active', 'suspended', 'locked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_credentials" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255), "status" "public"."auth_credentials_status_enum" NOT NULL DEFAULT 'pending', "failed_login_attempts" integer NOT NULL DEFAULT '0', "last_login" TIMESTAMP, "password_reset_required" boolean NOT NULL DEFAULT false, "two_factor_enabled" boolean NOT NULL DEFAULT false, "metadata" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_64358e9de820068515ed2e14a36" UNIQUE ("email"), CONSTRAINT "REL_8555dcc06a7fc7fa9844a5e724" UNIQUE ("user_id"), CONSTRAINT "PK_90fdced0865b5f15586e7cd3b25" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_64358e9de820068515ed2e14a3" ON "auth_credentials" ("email") `,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tenantId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "passwordHash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "lastLoginAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invitedAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invitedBy"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invitationToken"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedAt"`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "PK_88481b0c4ed9ada47e9fdd67475"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "PK_86033897c009fcca8b6505d6be2" PRIMARY KEY ("roleId")`,
    );
    await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "userId"`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "PK_86033897c009fcca8b6505d6be2"`,
    );
    await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "roleId"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "tenant_id" uuid`);
    await queryRunner.query(`ALTER TABLE "users" ADD "last_login_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD "invited_at" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD "invited_by" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "activated_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_system_admin" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "updated_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "user_roles" ADD "user_id" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "PK_87b8888186ca9769c960e926870" PRIMARY KEY ("user_id")`,
    );
    await queryRunner.query(`ALTER TABLE "user_roles" ADD "role_id" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "PK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "PK_23ed6f04fe43066df08379fd034" PRIMARY KEY ("user_id", "role_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_109638590074998bb72a2f2cf0" ON "users" ("tenant_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0142a2b9a38c853c56fcc9030c" ON "users" ("tenant_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e9f4c2efab52114c4e99e28efb" ON "users" ("tenant_id", "email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" ADD CONSTRAINT "FK_9691367d446cd8b18f462c191b3" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_109638590074998bb72a2f2cf08" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_credentials" ADD CONSTRAINT "FK_8555dcc06a7fc7fa9844a5e7245" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_b23c65e50a758245a33ee35fda1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "FK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_credentials" DROP CONSTRAINT "FK_8555dcc06a7fc7fa9844a5e7245"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_109638590074998bb72a2f2cf08"`);
    await queryRunner.query(
      `ALTER TABLE "auth_tokens" DROP CONSTRAINT "FK_9691367d446cd8b18f462c191b3"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_b23c65e50a758245a33ee35fda"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_87b8888186ca9769c960e92687"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e9f4c2efab52114c4e99e28efb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_0142a2b9a38c853c56fcc9030c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_109638590074998bb72a2f2cf0"`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "PK_23ed6f04fe43066df08379fd034"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "PK_87b8888186ca9769c960e926870" PRIMARY KEY ("user_id")`,
    );
    await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "role_id"`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "PK_87b8888186ca9769c960e926870"`,
    );
    await queryRunner.query(`ALTER TABLE "user_roles" DROP COLUMN "user_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "is_system_admin"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "activated_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invited_by"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "invited_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_login_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "tenant_id"`);
    await queryRunner.query(`ALTER TABLE "user_roles" ADD "roleId" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "PK_86033897c009fcca8b6505d6be2" PRIMARY KEY ("roleId")`,
    );
    await queryRunner.query(`ALTER TABLE "user_roles" ADD "userId" uuid NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "user_roles" DROP CONSTRAINT "PK_86033897c009fcca8b6505d6be2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "PK_88481b0c4ed9ada47e9fdd67475" PRIMARY KEY ("userId", "roleId")`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "users" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "users" ADD "invitationToken" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "invitedBy" character varying`);
    await queryRunner.query(`ALTER TABLE "users" ADD "invitedAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD "lastLoginAt" TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "users" ADD "passwordHash" character varying NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD "tenantId" uuid NOT NULL`);
    await queryRunner.query(`DROP INDEX "public"."IDX_64358e9de820068515ed2e14a3"`);
    await queryRunner.query(`DROP TABLE "auth_credentials"`);
    await queryRunner.query(`DROP TYPE "public"."auth_credentials_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3a94cfa1eada85ac2bf6f3016b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d8bc26f37312d1b86ce1e45bea"`);
    await queryRunner.query(`DROP TABLE "auth_tokens"`);
    await queryRunner.query(`DROP TYPE "public"."auth_tokens_token_type_enum"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_86033897c009fcca8b6505d6be" ON "user_roles" ("roleId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_472b25323af01488f1f66a06b6" ON "user_roles" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7346b08032078107fce81e014f" ON "users" ("tenantId", "email") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_79c1ec9a4dcf46670d495664a3" ON "users" ("tenantId", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c58f7e88c286e5e3478960a998" ON "users" ("tenantId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_86033897c009fcca8b6505d6be2" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_roles" ADD CONSTRAINT "FK_472b25323af01488f1f66a06b67" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_c58f7e88c286e5e3478960a998b" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
