import { PartialType } from '@nestjs/mapped-types';
import { CreateCubetaDto } from './create-cubeta.dto';

export class UpdateCubetaDto extends PartialType(CreateCubetaDto) { }
