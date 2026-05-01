import { IsNotEmpty, IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';

export class CreateHistoriaClinicaDto {
    @IsNotEmpty()
    @IsNumber()
    pacienteId: number;

    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsOptional()
    @IsString()
    pieza?: string;

    @IsOptional()
    @IsNumber()
    cantidad?: number;

    @IsOptional()
    @IsNumber()
    proformaDetalleId?: number;

    @IsNotEmpty()
    @IsString()
    observaciones: string;

    @IsOptional()
    @IsNumber()
    especialidadId?: number;

    @IsNotEmpty()
    @IsNumber()
    doctorId: number;


    @IsNotEmpty()
    @IsString()
    diagnostico: string;



    @IsOptional()
    @IsString()
    estadoTratamiento?: string;

    @IsOptional()
    @IsString()
    estadoPresupuesto?: string;

    @IsOptional()
    @IsNumber()
    proformaId?: number;

    @IsOptional()
    @IsString()
    tratamiento?: string;



    @IsOptional()
    casoClinico?: boolean;


    @IsOptional()
    @IsString()
    pagado?: string;

    @IsOptional()
    @IsNumber()
    precio?: number;

    @IsOptional()
    @IsNumber()
    descuento?: number; // % descuento por tratamiento

    @IsOptional()
    @IsNumber()
    precioConDescuento?: number;

    @IsOptional()
    @IsString()
    firmaPaciente?: string;

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
