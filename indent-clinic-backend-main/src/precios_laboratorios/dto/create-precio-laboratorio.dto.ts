import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePrecioLaboratorioDto {
    @IsString()
    @IsNotEmpty()
    detalle: string;

    @IsNumber()
    @IsNotEmpty()
    precio: number;

    @IsNumber()
    @IsNotEmpty()
    idLaboratorio: number;

    @IsString()
    @IsOptional()
    estado?: string;
}
