import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateClinicaDto {
    @IsString()
    @MaxLength(150)
    nombre: string;

    @IsOptional()
    @IsString()
    direccion?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    telefono?: string;

    @IsOptional()
    @IsString()
    @MaxLength(10)
    codigoPaisCelular?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    celular?: string;

    @IsString()
    @IsOptional()
    monedaDefault?: string;

    @IsOptional()
    @IsBoolean()
    activo?: boolean;

    @IsOptional()
    @IsString()
    horario_atencion?: string;

    @IsOptional()
    @IsString()
    fecha_cierre_caja?: string;

    @IsOptional()
    @IsString()
    logo?: string;

    @IsOptional()
    @IsString()
    qr_pago?: string;
}
