import { IsNumber, IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreatePagoLaboratorioDto {
    @IsString()
    @IsNotEmpty()
    fecha: string;

    @IsNumber()
    @IsNotEmpty()
    idTrabajos_Laboratorios: number;

    @IsNumber()
    @IsNotEmpty()
    monto: number;

    @IsString()
    @IsNotEmpty()
    moneda: string;

    @IsNumber()
    @IsNotEmpty()
    idforma_pago: number;

    @IsOptional()
    @IsNumber()
    tc?: number;

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
