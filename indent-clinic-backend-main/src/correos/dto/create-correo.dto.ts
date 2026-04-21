import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCorreoDto {
    @IsNumber()
    @IsNotEmpty()
    remitente_id: number;

    @IsNumber()
    @IsNotEmpty()
    destinatario_id: number;

    @IsNumber()
    @IsOptional()
    copia_id?: number;

    @IsString()
    @IsNotEmpty()
    asunto: string;

    @IsString()
    @IsNotEmpty()
    mensaje: string;
}
