import { IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateProveedorDto {
    @IsString()
    proveedor: string;

    @IsString()
    celular: string;

    @IsString()
    direccion: string;

    @IsEmail()
    email: string;

    @IsString()
    nombre_contacto: string;

    @IsString()
    celular_contacto: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
