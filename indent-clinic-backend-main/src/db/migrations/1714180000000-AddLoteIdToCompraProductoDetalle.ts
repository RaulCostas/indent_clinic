import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoteIdToCompraProductoDetalle1714180000000 implements MigrationInterface {
    name = 'AddLoteIdToCompraProductoDetalle1714180000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "compra_producto_detalle" 
            ADD COLUMN IF NOT EXISTS "loteId" integer;
        `);

        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_compra_detalle_lote') THEN 
                    ALTER TABLE "compra_producto_detalle" 
                    ADD CONSTRAINT "FK_compra_detalle_lote" 
                    FOREIGN KEY ("loteId") REFERENCES "lote_producto"("id") 
                    ON DELETE SET NULL ON UPDATE NO ACTION;
                END IF; 
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "compra_producto_detalle" DROP CONSTRAINT IF EXISTS "FK_compra_detalle_lote"`);
        await queryRunner.query(`ALTER TABLE "compra_producto_detalle" DROP COLUMN IF EXISTS "loteId"`);
    }
}
