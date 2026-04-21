import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClinicaIdToPacientes1712000000000 implements MigrationInterface {
    name = 'AddClinicaIdToPacientes1712000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Añadir la columna clinicaId (si no existe)
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pacientes' AND column_name='clinicaId') THEN
                    ALTER TABLE "pacientes" ADD "clinicaId" integer;
                END IF;
            END $$;
        `);

        // 2. Asignar ID 1 a todos los pacientes existentes (Clínica Principal)
        // Esto previene que los pacientes "desaparezcan" al activar el filtrado
        await queryRunner.query(`
            UPDATE "pacientes" SET "clinicaId" = 1 WHERE "clinicaId" IS NULL;
        `);

        // 3. Crear el índice para mejorar el rendimiento de filtrado
        await queryRunner.query(`
            CREATE INDEX "IDX_PACIENTE_CLINICA" ON "pacientes" ("clinicaId");
        `);
        
        // 4. Añadir constraint de Foreign Key opcional (si existe la tabla clinicas)
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='clinicas') THEN
                    ALTER TABLE "pacientes" ADD CONSTRAINT "FK_PACIENTE_CLINICA" 
                    FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE SET NULL;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pacientes" DROP CONSTRAINT IF EXISTS "FK_PACIENTE_CLINICA"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_PACIENTE_CLINICA"`);
        await queryRunner.query(`ALTER TABLE "pacientes" DROP COLUMN "clinicaId"`);
    }

}
