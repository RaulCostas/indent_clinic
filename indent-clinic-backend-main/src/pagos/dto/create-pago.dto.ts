import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreatePagoDto {
    @IsNotEmpty()
    @IsNumber()
    pacienteId: number;

    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsOptional()
    @IsNumber()
    proformaId?: number;

    @IsNotEmpty()
    @IsNumber()
    monto: number;

    @IsNotEmpty()
    @IsNumber()
    tc: number;

    @IsOptional()
    @IsNumber()
    monto_comision?: number;

    @IsNotEmpty()
    @IsEnum(['Bolivianos', 'Dólares'])
    moneda: string;

    @IsOptional()
    @IsString()
    recibo?: string;

    @IsOptional()
    @IsString()
    factura?: string;



    @IsOptional()
    @IsNumber()
    comisionTarjetaId?: number;

    @IsOptional()
    @IsNumber()
    formaPagoId?: number;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    @IsNumber()
    clinicaId?: number;

    @IsOptional()
    @IsNumber()
    historiaClinicaId?: number;

    @IsOptional()
    @IsNumber()
    descuento?: number;

    @IsOptional()
    @IsNumber()
    usuarioId?: number;

    @IsOptional()
    @IsNumber()
    idUsuario?: number;

    @IsOptional()
    @IsNumber()
    idUsuarioBypass?: number;

    @IsOptional()
    assignments?: { historiaClinicaId: number, monto: number, descuento: number }[];
}
