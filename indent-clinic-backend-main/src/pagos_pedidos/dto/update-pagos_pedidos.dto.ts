import { PartialType } from '@nestjs/mapped-types';
import { CreatePagosPedidosDto } from './create-pagos_pedidos.dto';

export class UpdatePagosPedidosDto extends PartialType(CreatePagosPedidosDto) { }
