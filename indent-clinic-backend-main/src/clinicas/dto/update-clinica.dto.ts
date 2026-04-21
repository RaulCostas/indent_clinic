import { PartialType } from '@nestjs/mapped-types';
import { CreateClinicaDto } from './create-clinica.dto';

export class UpdateClinicaDto extends PartialType(CreateClinicaDto) { }
