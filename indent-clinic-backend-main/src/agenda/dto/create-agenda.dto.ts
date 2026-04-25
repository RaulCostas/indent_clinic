import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, Min, Max } from 'class-validator';

export class CreateAgendaDto {
    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsNotEmpty()
    @IsString()
    hora: string;

    @IsNotEmpty()
    @IsNumber()
    duracion: number;


    @IsOptional()
    @IsNumber()
    pacienteId?: number;

    @IsNotEmpty()
    @IsNumber()
    doctorId: number;

    @IsOptional()
    @IsNumber()
    proformaId?: number;

    @IsNotEmpty()
    @IsNumber()
    usuarioId: number;

    @IsOptional()
    @IsString()
    estado?: string;

    @IsOptional()
    @IsString()
    tratamiento?: string;

    @IsOptional()
    @IsString()
    motivoCancelacion?: string;

    @IsNotEmpty()
    @IsNumber()
    clinicaId: number;

    @IsOptional()
    @IsString()
    observacion?: string;

    @IsOptional()
    @IsString()
    sucursal?: string;

    @IsOptional()
    @IsNumber()
    doctorDerivaId?: number;
}
