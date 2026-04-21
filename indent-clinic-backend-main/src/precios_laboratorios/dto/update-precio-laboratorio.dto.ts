import { PartialType } from '@nestjs/mapped-types';
import { CreatePrecioLaboratorioDto } from './create-precio-laboratorio.dto';

export class UpdatePrecioLaboratorioDto extends PartialType(CreatePrecioLaboratorioDto) { }
