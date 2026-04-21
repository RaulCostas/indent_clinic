import { PartialType } from '@nestjs/mapped-types';
import { CreatePagosDoctoresDto } from './create-pagos_doctores.dto';

export class UpdatePagosDoctoresDto extends PartialType(CreatePagosDoctoresDto) { }
