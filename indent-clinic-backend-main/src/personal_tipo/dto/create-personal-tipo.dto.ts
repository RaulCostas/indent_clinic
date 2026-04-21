import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreatePersonalTipoDto {
    @IsString()
    @IsNotEmpty()
    area: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
