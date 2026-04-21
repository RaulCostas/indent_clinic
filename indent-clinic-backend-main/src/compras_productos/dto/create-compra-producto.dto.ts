import { IsInt, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

class CompraProductoDetalleDto {
    @IsInt()
    productoId: number;

    @IsInt()
    @Min(1)
    cantidad: number;

    @IsNumber()
    @Min(0)
    costo_unitario: number;
}

export class CreateCompraProductoDto {
    @IsInt()
    proveedorId: number;

    @IsInt()
    @IsOptional()
    clinicaId?: number;

    @IsNumber()
    @Min(0)
    total: number;

    @IsString()
    @IsOptional()
    fecha?: string;

    @IsString()
    @IsOptional()
    observaciones?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CompraProductoDetalleDto)
    detalles: CompraProductoDetalleDto[];
}
