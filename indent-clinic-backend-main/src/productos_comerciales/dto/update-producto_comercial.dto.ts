import { PartialType } from '@nestjs/mapped-types';
import { CreateProductoComercialDto } from './create-producto_comercial.dto';

export class UpdateProductoComercialDto extends PartialType(CreateProductoComercialDto) {}
