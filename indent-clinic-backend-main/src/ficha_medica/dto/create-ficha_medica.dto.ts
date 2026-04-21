import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateFichaMedicaDto {
    @IsString() @IsOptional() ultima_visita_odontologo?: string;
    @IsString() @IsOptional() motivo_consulta?: string;

    @IsBoolean() @IsOptional() bruxismo?: boolean;
    @IsBoolean() @IsOptional() alergia_medicamento?: boolean;
    @IsString() @IsOptional() alergia_medicamento_detalle?: string;
    @IsBoolean() @IsOptional() medicamento_72h?: boolean;
    @IsString() @IsOptional() medicamento_72h_detalle?: string;
    @IsBoolean() @IsOptional() tratamiento_medico?: boolean;
    @IsString() @IsOptional() tratamiento_medico_detalle?: string;
    @IsBoolean() @IsOptional() anestesiado_anteriormente?: boolean;
    @IsBoolean() @IsOptional() reaccion_anestesia?: boolean;
    @IsString() @IsOptional() reaccion_anestesia_detalle?: string;

    @IsBoolean() @IsOptional() enf_neurologicas?: boolean;
    @IsString() @IsOptional() enf_neurologicas_detalle?: string;
    @IsBoolean() @IsOptional() enf_pulmonares?: boolean;
    @IsString() @IsOptional() enf_pulmonares_detalle?: string;
    @IsBoolean() @IsOptional() enf_cardiacas?: boolean;
    @IsString() @IsOptional() enf_cardiacas_detalle?: string;
    @IsBoolean() @IsOptional() enf_higado?: boolean;
    @IsString() @IsOptional() enf_higado_detalle?: string;
    @IsBoolean() @IsOptional() enf_gastricas?: boolean;
    @IsString() @IsOptional() enf_gastricas_detalle?: string;
    @IsBoolean() @IsOptional() enf_venereas?: boolean;
    @IsString() @IsOptional() enf_venereas_detalle?: string;
    @IsBoolean() @IsOptional() enf_renales?: boolean;
    @IsString() @IsOptional() enf_renales_detalle?: string;
    @IsBoolean() @IsOptional() articulaciones?: boolean;
    @IsString() @IsOptional() articulaciones_detalle?: string;
    @IsBoolean() @IsOptional() diabetes?: boolean;
    @IsString() @IsOptional() diabetes_detalle?: string;
    @IsBoolean() @IsOptional() hipertension?: boolean;
    @IsBoolean() @IsOptional() hipotension?: boolean;
    @IsBoolean() @IsOptional() anemia?: boolean;
    @IsString() @IsOptional() anemia_detalle?: string;
    @IsBoolean() @IsOptional() prueba_vih?: boolean;
    @IsString() @IsOptional() prueba_vih_resultado?: string;

    @IsBoolean() @IsOptional() anticonceptivo_hormonal?: boolean;
    @IsString() @IsOptional() anticonceptivo_hormonal_detalle?: string;
    @IsBoolean() @IsOptional() posibilidad_embarazo?: boolean;
    @IsString() @IsOptional() semana_gestacion?: string;

    @IsString() @IsOptional() cepillado_veces?: string;
    @IsBoolean() @IsOptional() usa_hilo_dental?: boolean;
    @IsBoolean() @IsOptional() usa_enjuague?: boolean;
    @IsBoolean() @IsOptional() fuma?: boolean;
    @IsString() @IsOptional() fuma_cantidad?: string;
    @IsBoolean() @IsOptional() consume_citricos?: boolean;

    @IsString() @IsOptional() observaciones?: string;
}
