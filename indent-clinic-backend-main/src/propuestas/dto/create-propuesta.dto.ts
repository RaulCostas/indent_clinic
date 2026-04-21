import { IsNotEmpty, IsNumber, IsString, IsOptional, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class CreatePropuestaDetalleDto {
    @IsOptional()
    @IsString()
    letra: string;

    @IsNotEmpty()
    @IsNumber()
    arancelId: number;

    @IsNotEmpty()
    @IsNumber()
    precioUnitario: number;

    @IsOptional()
    @IsString()
    piezas: string;

    @IsNotEmpty()
    @IsNumber()
    cantidad: number;

    @IsNotEmpty()
    @IsNumber()
    total: number;

    @IsOptional()
    @IsBoolean()
    posible: boolean;
}

export class CreatePropuestaDto {
    @IsNotEmpty()
    @IsNumber()
    pacienteId: number;

    @IsOptional()
    @IsNumber()
    clinicaId: number;

    @IsNotEmpty()
    @IsNumber()
    usuarioId: number;

    @IsNotEmpty()
    @IsString()
    fecha: string;



    @IsOptional()
    @IsString()
    nota: string;



    @IsNotEmpty()
    @IsNumber()
    total: number;

    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => CreatePropuestaDetalleDto)
    detalles: CreatePropuestaDetalleDto[];
}
