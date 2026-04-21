import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRecordatorioPlanDto {
    @IsNotEmpty()
    @IsInt()
    proformaId: number;

    @IsNotEmpty()
    @IsDateString()
    fechaRecordatorio: string;

    @IsNotEmpty()
    @IsInt()
    dias: number;

    @IsOptional()
    @IsString()
    mensaje?: string;

    @IsOptional()
    @IsString()
    estado?: string;
}
