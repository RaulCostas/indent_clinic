import { PartialType } from '@nestjs/mapped-types';
import { CreateRecordatorioPlanDto } from './create-recordatorio-plan.dto';

export class UpdateRecordatorioPlanDto extends PartialType(CreateRecordatorioPlanDto) { }
