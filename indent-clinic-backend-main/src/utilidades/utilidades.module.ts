import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UtilidadesService } from './utilidades.service';
import { UtilidadesController } from './utilidades.controller';

// Entities for Income
import { Pago } from '../pagos/entities/pago.entity';

// Entities for Expenses
import { Egreso } from '../egresos/entities/egreso.entity';
import { PagosDoctores } from '../pagos_doctores/entities/pagos_doctores.entity';
import { PagosPedidos } from '../pagos_pedidos/entities/pagos_pedidos.entity';
import { PagoLaboratorio } from '../pagos_laboratorios/entities/pago-laboratorio.entity';
import { PagosGastosFijos } from '../pagos_gastos_fijos/entities/pagos_gastos_fijos.entity';
import { OtrosIngresos } from '../otros-ingresos/entities/otros-ingresos.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Pago,
            Egreso,
            PagosDoctores,
            PagosPedidos,
            PagoLaboratorio,
            PagosGastosFijos,
            OtrosIngresos
        ])
    ],
    controllers: [UtilidadesController],
    providers: [UtilidadesService],
})
export class UtilidadesModule { }
