import { PartialType } from '@nestjs/mapped-types';
import { CreateHistoriaClinicaDto } from './create-historia_clinica.dto';

export class UpdateHistoriaClinicaDto extends PartialType(CreateHistoriaClinicaDto) { }
