import { IsString, IsOptional, IsDateString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateFichaMedicaDto } from '../../ficha_medica/dto/create-ficha_medica.dto';

export class CreatePacienteDto {
    @IsDateString()
    @IsOptional()
    fecha?: string;


    @IsString()
    paterno: string;

    @IsString()
    @IsOptional()
    materno?: string;

    @IsString()
    nombre: string;

    @IsString()
    @IsOptional()
    ci?: string;

    @IsString()
    direccion: string;

    @IsString()
    @IsOptional()
    lugar_residencia?: string;

    @IsString()
    telefono: string;

    @IsString()
    celular: string;

    @IsString()
    email: string;

    @IsString()
    casilla: string;

    @IsString()
    profesion: string;

    @IsString()
    estado_civil: string;

    @IsString()
    direccion_oficina: string;

    @IsString()
    telefono_oficina: string;

    @IsDateString()
    fecha_nacimiento: string;

    @IsString()
    sexo: string;

    @IsString()
    seguro_medico: string;

    @IsString()
    poliza: string;

    @IsDateString()
    @IsOptional()
    fecha_vencimiento?: string;



    @IsString()
    responsable: string;

    @IsString()
    parentesco: string;

    @IsString()
    direccion_responsable: string;

    @IsString()
    telefono_responsable: string;



    @IsString()
    @IsOptional()
    estado: string;

    @IsString()
    @IsOptional()
    clasificacion?: string;

    @IsNumber()
    @IsOptional()
    clinicaId?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateFichaMedicaDto)
    fichaMedica?: CreateFichaMedicaDto;
}
