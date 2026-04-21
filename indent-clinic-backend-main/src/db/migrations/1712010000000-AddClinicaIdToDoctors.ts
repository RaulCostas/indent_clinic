import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClinicaIdToDoctors1712010000000 implements MigrationInterface {
    name = 'AddClinicaIdToDoctors1712010000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Añadir la columna clinicaId (si no existe)
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='doctor' AND column_name='clinicaId') THEN
                    ALTER TABLE "doctor" ADD "clinicaId" integer;
                END IF;
            END $$;
        `);

        // 2. Asignar ID 1 a todos los doctores existentes
        await queryRunner.query(`
            UPDATE "doctor" SET "clinicaId" = 1 WHERE "clinicaId" IS NULL;
        `);

        // 3. Crear el índice
        await queryRunner.query(`
            CREATE INDEX "IDX_DOCTOR_CLINICA" ON "doctor" ("clinicaId");
        `);
        
        // 4. Añadir constraint de Foreign Key
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='clinicas') THEN
                    ALTER TABLE "doctor" ADD CONSTRAINT "FK_DOCTOR_CLINICA" 
                    FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE SET NULL;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctor" DROP CONSTRAINT IF EXISTS "FK_DOCTOR_CLINICA"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_DOCTOR_CLINICA"`);
        await queryRunner.query(`ALTER TABLE "doctor" DROP COLUMN "clinicaId"`);
    }

}
