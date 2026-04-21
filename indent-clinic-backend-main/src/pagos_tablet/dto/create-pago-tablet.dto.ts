import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class CreatePagoTabletDto {
    @IsString()
    @IsNotEmpty()
    nombre_paciente: string;

    @IsNumber()
    @Min(0)
    monto: number;

    @IsNumber()
    @IsNotEmpty()
    formaPagoId: number;

    @IsNumber()
    @IsOptional()
    clinicaId?: number;

    @IsString()
    @IsOptional()
    fecha?: string;
}
