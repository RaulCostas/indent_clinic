import { IsNotEmpty, IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateVacacionDto {
    @IsNotEmpty()
    @IsNumber()
    idpersonal: number;

    @IsOptional()
    @IsDateString()
    fecha?: string;

    @IsNotEmpty()
    @IsString()
    tipo_solicitud: string;

    @IsNotEmpty()
    @IsNumber()
    cantidad_dias: number;

    @IsNotEmpty()
    @IsDateString()
    fecha_desde: string;

    @IsNotEmpty()
    @IsDateString()
    fecha_hasta: string;

    @IsOptional()
    @IsString()
    autorizado?: string;

    @IsOptional()
    @IsString()
    observaciones?: string;
}
