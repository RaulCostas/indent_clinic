import { IsString, IsOptional } from 'class-validator';

export class CreateEspecialidadDto {
    @IsString()
    especialidad: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
