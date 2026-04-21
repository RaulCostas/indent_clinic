import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateDoctorDto {
    @IsString()
    paterno: string;

    @IsString()
    materno: string;

    @IsString()
    nombre: string;

    @IsString()
    celular: string;

    @IsString()
    direccion: string;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsNumber()
    @IsOptional()
    idEspecialidad?: number;
}
