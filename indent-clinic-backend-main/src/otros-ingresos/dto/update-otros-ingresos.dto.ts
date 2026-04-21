import { PartialType } from '@nestjs/mapped-types';
import { CreateOtrosIngresosDto } from './create-otros-ingresos.dto';

export class UpdateOtrosIngresosDto extends PartialType(CreateOtrosIngresosDto) {}
