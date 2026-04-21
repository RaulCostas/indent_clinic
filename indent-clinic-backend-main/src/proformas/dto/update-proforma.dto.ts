// This file is likely extending CreateProformaDto, so no changes needed if CreateProformaDto was updated.
import { PartialType } from '@nestjs/mapped-types';
import { CreateProformaDto } from './create-proforma.dto';

export class UpdateProformaDto extends PartialType(CreateProformaDto) { }
