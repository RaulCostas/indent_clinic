import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGastosFijosDto {


    @IsNumber()
    @IsNotEmpty()
    dia: number;

    @IsBoolean()
    @IsOptional()
    anual: boolean;

    @IsString()
    @IsOptional()
    mes?: string;

    @IsString()
    @IsNotEmpty()
    gasto_fijo: string;

    @IsNumber()
    @IsNotEmpty()
    monto: number;

    @IsString()
    @IsNotEmpty()
    moneda: string;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
