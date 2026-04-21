import { PartialType } from '@nestjs/mapped-types';
import { CreateGastosFijosDto } from './create-gastos_fijos.dto';

export class UpdateGastosFijosDto extends PartialType(CreateGastosFijosDto) { }
