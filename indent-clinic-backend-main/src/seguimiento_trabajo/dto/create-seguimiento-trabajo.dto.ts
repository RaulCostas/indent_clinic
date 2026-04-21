import { IsString, IsNumber, IsIn, IsDateString, IsOptional } from 'class-validator';

export class CreateSeguimientoTrabajoDto {
    @IsIn(['Envio', 'Retorno'])
    envio_retorno: 'Envio' | 'Retorno';

    @IsDateString()
    fecha: string;

    @IsString()
    observaciones: string;

    @IsNumber()
    trabajoLaboratorioId: number;

    @IsNumber()
    @IsOptional()
    clinicaId: number;
}
