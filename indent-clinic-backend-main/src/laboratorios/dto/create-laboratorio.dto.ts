import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateLaboratorioDto {
    @IsString()
    @IsNotEmpty()
    laboratorio: string;

    @IsString()
    @IsOptional()
    celular: string;

    @IsString()
    @IsOptional()
    telefono: string;

    @IsString()
    @IsOptional()
    direccion: string;

    @IsString()
    @IsOptional()
    email: string;

    @IsString()
    @IsOptional()
    banco: string;

    @IsString()
    @IsOptional()
    numero_cuenta: string;

    @IsString()
    @IsNotEmpty()
    estado: string;
}
