import { PartialType } from '@nestjs/mapped-types';
import { CreatePersonalTipoDto } from './create-personal-tipo.dto';

export class UpdatePersonalTipoDto extends PartialType(CreatePersonalTipoDto) { }
