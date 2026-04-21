import { IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePagosGastosFijosDto {
    @IsNumber()
    gastoFijoId: number;

    @IsString()
    fecha: string;

    @IsNumber()
    monto: number;

    @IsString()
    moneda: string;

    @IsOptional()
    @IsNumber()
    formaPagoId?: number;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
