import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateQuickPacienteDto {
    @IsString()
    nombre: string;

    @IsString()
    paterno: string;

    @IsString()
    @IsOptional()
    materno?: string;

    @IsString()
    celular: string;

    @IsString()
    sexo: string;

    @IsString()
    seguro_medico: string;

    @IsString()
    @IsOptional()
    fecha_vencimiento?: string;

    @IsNumber()
    @IsOptional()
    clinicaId?: number;

    @IsOptional()
    @IsNumber()
    usuarioId?: number;
}
