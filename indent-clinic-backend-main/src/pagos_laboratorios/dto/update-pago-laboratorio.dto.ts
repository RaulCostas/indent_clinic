import { PartialType } from '@nestjs/mapped-types';
import { CreatePagoLaboratorioDto } from './create-pago-laboratorio.dto';

export class UpdatePagoLaboratorioDto extends PartialType(CreatePagoLaboratorioDto) { }
