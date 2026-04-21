import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateInventarioDto {
    @IsString()
    @IsNotEmpty()
    descripcion: string;

    @IsNumber()
    cantidad_existente: number;

    @IsNumber()
    stock_minimo: number;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsNumber()
    @IsOptional()
    idespecialidad?: number;

    @IsNumber()
    @IsOptional()
    idgrupo_inventario?: number;

    @IsNumber()
    @IsOptional()
    clinicaId?: number;
}

export class UpdateInventarioDto {
    @IsString()
    @IsOptional()
    descripcion?: string;

    @IsNumber()
    @IsOptional()
    cantidad_existente?: number;

    @IsNumber()
    @IsOptional()
    stock_minimo?: number;

    @IsString()
    @IsOptional()
    estado?: string;

    @IsNumber()
    @IsOptional()
    idespecialidad?: number;

    @IsNumber()
    @IsOptional()
    idgrupo_inventario?: number;

    @IsNumber()
    @IsOptional()
    clinicaId?: number;
}

