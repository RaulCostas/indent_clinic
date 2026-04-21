import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialCommercialModules1712710000000 implements MigrationInterface {
    name = 'InitialCommercialModules1712710000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create producto_comercial
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "producto_comercial" (
                "id" SERIAL PRIMARY KEY,
                "nombre" character varying NOT NULL,
                "precio_venta" numeric(12,2) NOT NULL,
                "costo" numeric(12,2) NOT NULL,
                "stock_actual" integer NOT NULL DEFAULT 0,
                "stock_minimo" integer NOT NULL DEFAULT 0,
                "estado" character varying NOT NULL DEFAULT 'activo',
                "clinicaId" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_producto_comercial_clinica" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // 2. Create lote_producto
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "lote_producto" (
                "id" SERIAL PRIMARY KEY,
                "productoId" integer NOT NULL,
                "numero_lote" character varying,
                "fecha_vencimiento" date,
                "costo_unitario" numeric(12,2) NOT NULL,
                "cantidad_inicial" integer NOT NULL,
                "cantidad_actual" integer NOT NULL,
                "clinicaId" integer,
                "estado" character varying NOT NULL DEFAULT 'activo',
                "fecha_ingreso" TIMESTAMP NOT NULL DEFAULT now(),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_lote_producto_producto" FOREIGN KEY ("productoId") REFERENCES "producto_comercial"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_lote_producto_clinica" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // 3. Create venta_producto
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "venta_producto" (
                "id" SERIAL PRIMARY KEY,
                "fecha" TIMESTAMP NOT NULL DEFAULT now(),
                "personalId" integer NOT NULL,
                "pacienteId" integer NOT NULL,
                "total" numeric(12,2) NOT NULL,
                "comision_porcentaje" numeric(12,2) NOT NULL DEFAULT 40,
                "comision_monto" numeric(12,2) NOT NULL,
                "formaPagoId" integer,
                "clinicaId" integer,
                "observaciones" text,
                "comision_pagada" boolean NOT NULL DEFAULT false,
                "comision_fecha_pago" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_venta_producto_personal" FOREIGN KEY ("personalId") REFERENCES "personal"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_venta_producto_paciente" FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_venta_producto_forma_pago" FOREIGN KEY ("formaPagoId") REFERENCES "forma_pago"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_venta_producto_clinica" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // 4. Create venta_producto_detalle
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "venta_producto_detalle" (
                "id" SERIAL PRIMARY KEY,
                "ventaId" integer NOT NULL,
                "productoId" integer NOT NULL,
                "cantidad" integer NOT NULL,
                "precio_unitario" numeric(12,2) NOT NULL,
                "subtotal" numeric(12,2) NOT NULL,
                CONSTRAINT "FK_venta_detalle_venta" FOREIGN KEY ("ventaId") REFERENCES "venta_producto"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_venta_detalle_producto" FOREIGN KEY ("productoId") REFERENCES "producto_comercial"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // 5. Create venta_producto_detalle_lote
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "venta_producto_detalle_lote" (
                "id" SERIAL PRIMARY KEY,
                "ventaDetalleId" integer NOT NULL,
                "loteId" integer NOT NULL,
                "cantidad" integer NOT NULL,
                "costo_historico_lote" numeric(12,2) NOT NULL,
                CONSTRAINT "FK_venta_detalle_lote_detalle" FOREIGN KEY ("ventaDetalleId") REFERENCES "venta_producto_detalle"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_venta_detalle_lote_lote" FOREIGN KEY ("loteId") REFERENCES "lote_producto"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // 6. Create compra_producto
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "compra_producto" (
                "id" SERIAL PRIMARY KEY,
                "fecha" date NOT NULL,
                "total" numeric(12,2) NOT NULL,
                "pagada" boolean NOT NULL DEFAULT false,
                "fecha_pago" TIMESTAMP,
                "observaciones" text,
                "proveedorId" integer NOT NULL,
                "clinicaId" integer,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "FK_compra_producto_proveedor" FOREIGN KEY ("proveedorId") REFERENCES "proveedores"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
                CONSTRAINT "FK_compra_producto_clinica" FOREIGN KEY ("clinicaId") REFERENCES "clinicas"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // 7. Create compra_producto_detalle
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "compra_producto_detalle" (
                "id" SERIAL PRIMARY KEY,
                "compraId" integer NOT NULL,
                "productoId" integer NOT NULL,
                "cantidad" integer NOT NULL,
                "costo_unitario" numeric(12,2) NOT NULL,
                "subtotal" numeric(12,2) NOT NULL,
                "numero_lote" character varying,
                "fecha_vencimiento" date,
                CONSTRAINT "FK_compra_detalle_compra" FOREIGN KEY ("compraId") REFERENCES "compra_producto"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_compra_detalle_producto" FOREIGN KEY ("productoId") REFERENCES "producto_comercial"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
            )
        `);

        // 8. Add cancelado to historia_clinica if not exists
        await queryRunner.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='historia_clinica' AND column_name='cancelado') THEN
                    ALTER TABLE "historia_clinica" ADD COLUMN "cancelado" numeric(12,2) DEFAULT 0;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "venta_producto_detalle_lote"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "venta_producto_detalle"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "venta_producto"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "lote_producto"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "compra_producto_detalle"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "compra_producto"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "producto_comercial"`);
        // We don't drop the 'cancelado' column to avoid data loss in rolls.
    }
}
