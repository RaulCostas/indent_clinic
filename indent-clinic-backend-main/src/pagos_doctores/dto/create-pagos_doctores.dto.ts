import { IsNotEmpty, IsNumber, IsDateString, IsString, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class DetalleDto {
    @IsNumber()
    @IsNotEmpty()
    idhistoria_clinica: number;

    @IsNumber()
    @IsOptional()
    costo_laboratorio?: number;

    @IsDateString()
    @IsOptional()
    fecha_pago_paciente?: string;

    @IsString()
    @IsOptional()
    forma_pago_paciente?: string;

    @IsString()
    @IsOptional()
    factura?: string;

    @IsNumber()
    @IsOptional()
    descuento?: number;

    @IsNumber()
    @IsOptional()
    comision?: number;

    @IsNumber()
    @IsNotEmpty()
    total: number;
}

export class CreatePagosDoctoresDto {
    @IsNumber()
    @IsNotEmpty()
    idDoctor: number;

    @IsDateString()
    @IsNotEmpty()
    fecha: string;

    @IsNumber()
    @IsNotEmpty()
    comision: number;

    @IsNumber()
    @IsNotEmpty()
    total: number;

    @IsString()
    @IsNotEmpty()
    moneda: string;

    @IsNumber()
    @IsOptional()
    tc?: number;

    @IsNumber()
    @IsNotEmpty()
    idForma_pago: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DetalleDto)
    detalles: DetalleDto[];

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
