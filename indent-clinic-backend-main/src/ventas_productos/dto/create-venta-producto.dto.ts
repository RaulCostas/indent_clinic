import { IsInt, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsDateString, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class VentaDetalleDto {
    @IsInt()
    productoId: number;

    @IsInt()
    @Min(1)
    cantidad: number;

    @IsNumber()
    @Min(0)
    precio_unitario: number;

    @IsInt()
    @IsOptional()
    loteId?: number;
}

export class CreateVentaProductoDto {
    @IsInt()
    personalId: number;

    @IsInt()
    pacienteId: number;

    @IsInt()
    @IsOptional()
    clinicaId?: number;

    @IsInt()
    formaPagoId: number;

    @IsNumber()
    @Min(0)
    total: number;

    @IsString()
    @IsOptional()
    moneda?: string;

    @IsString()
    @IsOptional()
    fecha?: string;

    @IsString()
    @IsOptional()
    observaciones?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => VentaDetalleDto)
    detalles: VentaDetalleDto[];
}
