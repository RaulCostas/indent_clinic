import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLoteIdToCompraProductoDetalle1714180000000 implements MigrationInterface {
    name = 'AddLoteIdToCompraProductoDetalle1714180000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "compra_producto_detalle" 
            ADD COLUMN IF NOT EXISTS "loteId" integer;
        `);

        await queryRunner.query(`
            ALTER TABLE "compra_producto_detalle" 
            ADD CONSTRAINT "FK_compra_detalle_lote" 
            FOREIGN KEY ("loteId") REFERENCES "lote_producto"("id") 
            ON DELETE SET NULL ON UPDATE NO ACTION;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "compra_producto_detalle" DROP CONSTRAINT "FK_compra_detalle_lote"`);
        await queryRunner.query(`ALTER TABLE "compra_producto_detalle" DROP COLUMN "loteId"`);
    }
}
