import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class UpdatePricesDto {
    @IsNumber()
    @IsOptional()
    especialidadId?: number;

    @IsNumber()
    porcentaje: number;
}
