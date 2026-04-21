import { IsString, IsNumber, IsNotEmpty } from 'class-validator';



export class CreateComisionTarjetaDto {
    @IsString()
    @IsNotEmpty()
    redBanco: string;

    @IsNumber()
    @IsNotEmpty()
    monto: number;

    @IsString()
    @IsNotEmpty()
    estado: string;
}
