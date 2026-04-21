import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductoComercialDto {
    @IsString()
    nombre: string;

    @IsNumber()
    @Min(0)
    precio_venta: number;

    @IsNumber()
    @Min(0)
    costo: number;

    @IsNumber()
    @IsOptional()
    stock_actual?: number;

    @IsNumber()
    @IsOptional()
    stock_minimo?: number;

    @IsNumber()
    @IsOptional()
    clinicaId?: number;

    @IsString()
    @IsOptional()
    estado?: string;
}
