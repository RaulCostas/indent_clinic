import { PartialType } from '@nestjs/mapped-types';
import { CreateSeguimientoTrabajoDto } from './create-seguimiento-trabajo.dto';

export class UpdateSeguimientoTrabajoDto extends PartialType(CreateSeguimientoTrabajoDto) { }
