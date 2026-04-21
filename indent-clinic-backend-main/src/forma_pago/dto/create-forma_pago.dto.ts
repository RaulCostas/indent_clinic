import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFormaPagoDto {
    @IsString()
    @IsNotEmpty()
    forma_pago: string;

    @IsString()
    @IsOptional()
    estado?: string;
}
