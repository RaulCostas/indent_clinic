import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreateEgresoInventarioDto {
    @IsNotEmpty()
    @IsNumber()
    inventarioId: number;

    @IsNotEmpty()
    @IsString()
    fecha: string;

    @IsNotEmpty()
    @IsNumber()
    cantidad: number;

    @IsNotEmpty()
    @IsString()
    fecha_vencimiento: string;

    @IsNumber()
    @IsOptional()
    clinicaId?: number;
}
