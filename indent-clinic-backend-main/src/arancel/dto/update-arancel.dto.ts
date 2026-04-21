import { PartialType } from '@nestjs/mapped-types';
import { CreateArancelDto } from './create-arancel.dto';

export class UpdateArancelDto extends PartialType(CreateArancelDto) { }
