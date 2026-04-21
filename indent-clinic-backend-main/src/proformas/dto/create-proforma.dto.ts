import { IsNumber, IsString, IsArray, ValidateNested, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class CreateProformaDetalleDto {
    @IsOptional()
    @IsNumber()
    id?: number;

    @IsNumber()
    arancelId: number;

    @IsNumber()
    precioUnitario: number;

    @IsOptional()
    @IsString()
    piezas?: string;

    @IsNumber()
    cantidad: number;

    @IsNumber()
    total: number;

    @IsBoolean()
    posible: boolean;

    @IsOptional()
    @IsString()
    tipoPrecio?: string;
}

export class CreateProformaDto {
    @IsNumber()
    pacienteId: number;

    @IsNumber()
    usuarioId: number;

    @IsOptional()
    @IsString()
    nota?: string;

    @IsOptional()
    @IsString()
    fecha?: string;

    @IsOptional()
    @IsNumber()
    total?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProformaDetalleDto)
    detalles: CreateProformaDetalleDto[];

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
