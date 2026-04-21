import { MigrationInterface, QueryRunner } from "typeorm";

export class RevertClinicaIdFromDoctors1712020000000 implements MigrationInterface {
    name = 'RevertClinicaIdFromDoctors1712020000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Eliminar la Foreign Key
        await queryRunner.query(`ALTER TABLE "doctor" DROP CONSTRAINT IF EXISTS "FK_DOCTOR_CLINICA"`);

        // 2. Eliminar el índice
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_DOCTOR_CLINICA"`);

        // 3. Eliminar la columna
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "clinicaId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-añadir en caso de rollback (opcional, pero buena práctica)
        await queryRunner.query(`ALTER TABLE "doctor" ADD "clinicaId" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_DOCTOR_CLINICA" ON "doctor" ("clinicaId")`);
    }

}
