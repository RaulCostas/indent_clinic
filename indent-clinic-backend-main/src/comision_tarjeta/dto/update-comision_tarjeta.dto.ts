import { PartialType } from '@nestjs/mapped-types';
import { CreateComisionTarjetaDto } from './create-comision_tarjeta.dto';

export class UpdateComisionTarjetaDto extends PartialType(CreateComisionTarjetaDto) { }
