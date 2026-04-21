import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClinicaIdToHistoriaClinica1711980000000 implements MigrationInterface {
    name = 'AddClinicaIdToHistoriaClinica1711980000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Asegurar que la columna clinicaId exista en historia_clinica
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='historia_clinica' AND column_name='clinicaId') THEN
                    ALTER TABLE "historia_clinica" ADD "clinicaId" integer;
                END IF;
            END $$;
        `);

        // También verificamos pagos_tablet por si acaso, aunque el usuario dijo que ya existe
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='pagos_tablet' AND column_name='clinicaId') THEN
                    ALTER TABLE "pagos_tablet" ADD "clinicaId" integer;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "historia_clinica" DROP COLUMN "clinicaId"`);
        // No borramos la de pagos_tablet por seguridad ya que podría haber estado ahí antes
    }

}
