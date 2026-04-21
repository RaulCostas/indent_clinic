import { MigrationInterface, QueryRunner } from "typeorm";

export class DropUniqueConstraintWhatsappSessions1712040000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // En postgres 9.0+, IF EXISTS previene el fallo transaccional
        await queryRunner.query(`ALTER TABLE "whatsapp_sessions" DROP CONSTRAINT IF EXISTS "UQ_whatsapp_session_clinic_instance"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // empty
    }

}
