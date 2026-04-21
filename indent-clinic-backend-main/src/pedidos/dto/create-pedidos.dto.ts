import { IsNotEmpty, IsNumber, IsDateString, IsArray, ValidateNested, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePedidoDetalleDto {
    @IsNotEmpty()
    @IsNumber()
    idinventario: number;

    @IsNotEmpty()
    @IsNumber()
    cantidad: number;

    @IsNotEmpty()
    @IsNumber()
    precio_unitario: number;

    @IsNotEmpty()
    @IsString()
    fecha_vencimiento: string;
}

export class CreatePedidoDto {
    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsNotEmpty()
    @IsNumber()
    idproveedor: number;

    @IsNotEmpty()
    @IsNumber()
    Sub_Total: number;

    @IsNotEmpty()
    @IsNumber()
    Descuento: number;

    @IsNotEmpty()
    @IsNumber()
    Total: number;

    @IsOptional()
    @IsString()
    Observaciones?: string;

    @IsOptional()
    @IsBoolean()
    Pagado?: boolean;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreatePedidoDetalleDto)
    detalles: CreatePedidoDetalleDto[];

    @IsNumber()
    @IsOptional()
    clinicaId?: number;
}
