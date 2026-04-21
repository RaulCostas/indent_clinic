import { PartialType } from '@nestjs/mapped-types';
import { CreateVacacionDto } from './create-vacacion.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateVacacionDto extends PartialType(CreateVacacionDto) {
    @IsOptional()
    @IsString()
    estado?: string;
}
