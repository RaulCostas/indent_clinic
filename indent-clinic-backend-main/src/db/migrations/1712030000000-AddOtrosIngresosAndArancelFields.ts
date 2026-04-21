import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOtrosIngresosAndArancelFields1712030000000 implements MigrationInterface {
    name = 'AddOtrosIngresosAndArancelFields1712030000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear tabla otros_ingresos si no existe
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "otros_ingresos" (
                "id" SERIAL PRIMARY KEY,
                "fecha" date NOT NULL,
                "detalle" character varying NOT NULL,
                "monto" numeric(12,2) NOT NULL,
                "moneda" character varying NOT NULL,
                "forma_pago_id" integer NOT NULL,
                "clinicaId" integer,
                CONSTRAINT "FK_otros_ingresos_forma_pago" FOREIGN KEY ("forma_pago_id") REFERENCES "forma_pago"("id"),
                CONSTRAINT "FK_otros_ingresos_clinica" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id")
            )
        `);

        // Añadir campos a la tabla arancel
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='arancel' AND column_name='precio_gold') THEN
                    ALTER TABLE "arancel" ADD COLUMN "precio_gold" numeric(12,2);
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='arancel' AND column_name='precio_silver') THEN
                    ALTER TABLE "arancel" ADD COLUMN "precio_silver" numeric(12,2);
                END IF;

                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='arancel' AND column_name='precio_odontologico') THEN
                    ALTER TABLE "arancel" ADD COLUMN "precio_odontologico" numeric(12,2);
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "otros_ingresos"`);
        await queryRunner.query(`ALTER TABLE "arancel" DROP COLUMN IF EXISTS "precio_gold"`);
        await queryRunner.query(`ALTER TABLE "arancel" DROP COLUMN IF EXISTS "precio_silver"`);
        await queryRunner.query(`ALTER TABLE "arancel" DROP COLUMN IF EXISTS "precio_odontologico"`);
    }

}
