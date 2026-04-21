import { IsNotEmpty, IsNumber, IsString, IsDateString, IsOptional, IsIn } from 'class-validator';

export class CreateCalificacionDto {
    @IsNotEmpty()
    @IsNumber()
    personalId: number;

    @IsNotEmpty()
    @IsNumber()
    pacienteId: number;

    @IsNotEmpty()
    @IsNumber()
    @IsIn([1, 2, 3, 4, 5])
    consultorio: number;

    @IsNotEmpty()
    @IsString()
    @IsIn(['Malo', 'Regular', 'Bueno'])
    calificacion: string;

    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsOptional()
    @IsString()
    observaciones?: string;

    @IsNotEmpty()
    @IsNumber()
    evaluadorId: number;
}
