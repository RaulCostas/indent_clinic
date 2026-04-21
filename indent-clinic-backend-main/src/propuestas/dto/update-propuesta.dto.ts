import { PartialType } from '@nestjs/mapped-types';
import { CreatePropuestaDto } from './create-propuesta.dto';

export class UpdatePropuestaDto extends PartialType(CreatePropuestaDto) { }
