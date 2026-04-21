import { PartialType } from '@nestjs/mapped-types';
import { CreatePedidoDto } from './create-pedidos.dto';

export class UpdatePedidoDto extends PartialType(CreatePedidoDto) { }
