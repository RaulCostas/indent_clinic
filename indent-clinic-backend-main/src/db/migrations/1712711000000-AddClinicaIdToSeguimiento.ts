import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClinicaIdToSeguimiento1712711000000 implements MigrationInterface {
    name = 'AddClinicaIdToSeguimiento1712711000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seguimiento_trabajo' AND column_name='clinicaId') THEN
                    ALTER TABLE "seguimiento_trabajo" ADD COLUMN "clinicaId" integer;
                    ALTER TABLE "seguimiento_trabajo" ADD CONSTRAINT "FK_seguimiento_trabajo_clinica" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "seguimiento_trabajo" DROP CONSTRAINT IF EXISTS "FK_seguimiento_trabajo_clinica"`);
        await queryRunner.query(`ALTER TABLE "seguimiento_trabajo" DROP COLUMN IF EXISTS "clinicaId"`);
    }
}
