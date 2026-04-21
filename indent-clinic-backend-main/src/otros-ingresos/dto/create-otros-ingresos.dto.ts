import { IsString, IsNumber, IsDateString, IsIn, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateOtrosIngresosDto {
    @IsDateString()
    @IsNotEmpty()
    fecha: Date;

    @IsString()
    @IsNotEmpty()
    detalle: string;

    @IsNumber()
    @IsNotEmpty()
    monto: number;

    @IsString()
    @IsNotEmpty()
    @IsIn(['Bolivianos', 'Dólares'])
    moneda: string;

    @IsNumber()
    @IsNotEmpty()
    formaPagoId: number;

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
