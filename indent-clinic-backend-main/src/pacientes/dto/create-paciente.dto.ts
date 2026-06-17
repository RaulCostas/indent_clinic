import { IsString, IsOptional, IsDateString, ValidateNested, IsNumber, ValidateIf, IsNotEmpty } from 'class-validator';
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
    lugar_residencia: string;

    @IsString()
    telefono: string;

    @IsString()
    celular: string;

    @ValidateIf(o => [1, 3].includes(o.clinicaId))
    @IsNotEmpty({ message: 'El email es obligatorio para esta clínica' })
    @IsOptional()
    @IsString()
    email?: string;


    @IsString()
    profesion: string;

    @IsString()
    estado_civil: string;



    @IsDateString()
    fecha_nacimiento: string;

    @IsString()
    sexo: string;

    @IsString()
    seguro_medico: string;

    @ValidateIf(o => [1, 3].includes(o.clinicaId))
    @IsNotEmpty({ message: 'El código de seguro es obligatorio para esta clínica' })
    @IsOptional()
    @IsString()
    seguro_codigo?: string;


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

    @IsOptional()
    @IsNumber()
    usuarioId?: number;

    @IsOptional()
    @IsString()
    firmaFC?: string;
}
