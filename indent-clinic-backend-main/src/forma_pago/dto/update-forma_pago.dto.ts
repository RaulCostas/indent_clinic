import { PartialType } from '@nestjs/mapped-types';
import { CreateFormaPagoDto } from './create-forma_pago.dto';

export class UpdateFormaPagoDto extends PartialType(CreateFormaPagoDto) { }
