import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateArancelDto {
    @IsString()
    detalle: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    precio?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    precio_sin_seguro?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    precio_gold?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    precio_silver?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    precio_odontologico?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    comision?: number;

    @IsString()
    @IsOptional()
    moneda?: string;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsNumber()
    @Min(1)
    idEspecialidad: number;

    @IsNumber()
    @IsOptional()
    clinicaId?: number;
}
