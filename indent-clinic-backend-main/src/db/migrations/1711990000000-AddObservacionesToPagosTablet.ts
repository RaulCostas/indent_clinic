import { MigrationInterface, QueryRunner } from "typeorm";

export class AddObservacionesToPagosTablet1711990000000 implements MigrationInterface {
    name = 'AddObservacionesToPagosTablet1711990000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Asegurar que la columna observaciones exista en pagos_tablet
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='pagos_tablet' AND column_name='observaciones') THEN
                    ALTER TABLE "pagos_tablet" ADD "observaciones" text;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "pagos_tablet" DROP COLUMN "observaciones"`);
    }

}
