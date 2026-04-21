import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

export class CreateCubetaDto {
    @IsString()
    @IsNotEmpty()
    codigo: string;

    @IsString()
    @IsNotEmpty()
    descripcion: string;

    @IsString()
    @IsNotEmpty()
    @IsIn(['DENTRO', 'FUERA'])
    dentro_fuera: string;

    @IsString()
    @IsOptional()
    @IsIn(['activo', 'inactivo'])
    estado: string;

    @IsOptional()
    clinicaId: number;
}
