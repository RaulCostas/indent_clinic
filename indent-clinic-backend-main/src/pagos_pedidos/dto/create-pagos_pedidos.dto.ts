import { IsNotEmpty, IsDateString, IsNumber, IsString, IsOptional } from 'class-validator';

export class CreatePagosPedidosDto {
    @IsNotEmpty()
    @IsDateString()
    fecha: string;

    @IsNotEmpty()
    @IsNumber()
    idPedido: number;

    @IsNotEmpty()
    @IsNumber()
    monto: number;

    @IsOptional()
    @IsString()
    factura?: string;

    @IsOptional()
    @IsString()
    recibo?: string;

    @IsNotEmpty()
    @IsString()
    forma_pago: string;

    @IsOptional()
    @IsNumber()
    clinicaId?: number;
}
