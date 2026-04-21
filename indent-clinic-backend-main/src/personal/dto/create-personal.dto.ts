import { IsString, IsDateString, IsOptional, IsNumber } from 'class-validator';

export class CreatePersonalDto {
    @IsString()
    paterno: string;

    @IsString()
    materno: string;

    @IsString()
    nombre: string;

    @IsString()
    ci: string;

    @IsString()
    direccion: string;

    @IsString()
    telefono: string;

    @IsString()
    celular: string;

    @IsDateString()
    fecha_nacimiento: string;

    @IsDateString()
    fecha_ingreso: string;

    @IsOptional()
    @IsNumber()
    personalTipoId?: number;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsDateString()
    @IsOptional()
    fecha_baja?: string;

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
