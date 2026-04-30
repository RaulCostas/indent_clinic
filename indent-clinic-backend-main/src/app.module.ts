import { Module } from '@nestjs/common'; // Force Refresh
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { PersonalModule } from './personal/personal.module';
import { PersonalTipoModule } from './personal_tipo/personal_tipo.module';
import { EspecialidadModule } from './especialidad/especialidad.module';
import { ArancelModule } from './arancel/arancel.module';
import { User } from './users/entities/user.entity';
import { Doctor } from './doctors/entities/doctor.entity';
import { Proveedor } from './proveedores/entities/proveedor.entity';
import { Personal } from './personal/entities/personal.entity';
import { PersonalTipo } from './personal_tipo/entities/personal_tipo.entity';
import { Especialidad } from './especialidad/entities/especialidad.entity';
import { Arancel } from './arancel/entities/arancel.entity';
import { EgresosModule } from './egresos/egresos.module';
import { Egreso } from './egresos/entities/egreso.entity';
import { LaboratoriosModule } from './laboratorios/laboratorios.module';
import { Laboratorio } from './laboratorios/entities/laboratorio.entity';
import { PreciosLaboratoriosModule } from './precios_laboratorios/precios-laboratorios.module';
import { PrecioLaboratorio } from './precios_laboratorios/entities/precio-laboratorio.entity';
import { PacientesModule } from './pacientes/pacientes.module';
import { Paciente } from './pacientes/entities/paciente.entity';
import { PagosTabletModule } from './pagos_tablet/pagos_tablet.module';
import { PagoTablet } from './pagos_tablet/entities/pago_tablet.entity';

import { FichaMedicaModule } from './ficha_medica/ficha_medica.module';
import { FichaMedica } from './ficha_medica/entities/ficha_medica.entity';
import { ProformasModule } from './proformas/proformas.module';
import { HistoriaClinicaModule } from './historia_clinica/historia_clinica.module';
import { Proforma } from './proformas/entities/proforma.entity';
import { ProformaDetalle } from './proformas/entities/proforma-detalle.entity';
import { ProformaImagen } from './proformas/entities/proforma-imagen.entity';
import { HistoriaClinica } from './historia_clinica/entities/historia_clinica.entity';
import { PagosModule } from './pagos/pagos.module';
import { Pago } from './pagos/entities/pago.entity';
// import { PagoDetalle } from './pagos/entities/pago-detalle.entity';
import { ComisionTarjetaModule } from './comision_tarjeta/comision_tarjeta.module';
import { ComisionTarjeta } from './comision_tarjeta/entities/comision_tarjeta.entity';
import { AgendaModule } from './agenda/agenda.module';
import { Agenda } from './agenda/entities/agenda.entity';
import { ChatModule } from './chat/chat.module';
import { GastosFijosModule } from './gastos_fijos/gastos_fijos.module';
import { PagosGastosFijosModule } from './pagos_gastos_fijos/pagos_gastos_fijos.module';


import { PagosGastosFijos } from './pagos_gastos_fijos/entities/pagos_gastos_fijos.entity';
import { GastosFijos } from './gastos_fijos/entities/gastos_fijos.entity';

import { CorreosModule } from './correos/correos.module';
import { Correo } from './correos/entities/correo.entity';

import { FormaPagoModule } from './forma_pago/forma_pago.module';
import { FormaPago } from './forma_pago/entities/forma_pago.entity';
import { GrupoInventarioModule } from './grupo_inventario/grupo_inventario.module';
import { GrupoInventario } from './grupo_inventario/entities/grupo_inventario.entity';
import { InventarioModule } from './inventario/inventario.module';
import { Inventario } from './inventario/entities/inventario.entity';
import { EgresoInventarioModule } from './egreso_inventario/egreso_inventario.module';
import { EgresoInventario } from './egreso_inventario/entities/egreso_inventario.entity';
import { PedidosModule } from './pedidos/pedidos.module';
import { Pedidos } from './pedidos/entities/pedidos.entity';
import { PedidosDetalle } from './pedidos/entities/pedidos-detalle.entity';
import { PagosPedidosModule } from './pagos_pedidos/pagos_pedidos.module';
import { PagosLaboratoriosModule } from './pagos_laboratorios/pagos-laboratorios.module';
import { PagosPedidos } from './pagos_pedidos/entities/pagos_pedidos.entity';

import { ChatbotModule } from './chatbot/chatbot.module';
import { PacientesDeudoresModule } from './pacientes_deudores/pacientes_deudores.module';
import { ChatbotIntento } from './chatbot/entities/chatbot-intento.entity';
import { TrabajosLaboratoriosModule } from './trabajos_laboratorios/trabajos_laboratorios.module';
import { TrabajoLaboratorio } from './trabajos_laboratorios/entities/trabajo_laboratorio.entity';
import { CubetasModule } from './cubetas/cubetas.module';
import { Cubeta } from './cubetas/entities/cubeta.entity';
import { PagoLaboratorio } from './pagos_laboratorios/entities/pago-laboratorio.entity';
import { SeguimientoTrabajoModule } from './seguimiento_trabajo/seguimiento-trabajo.module';
import { SeguimientoTrabajo } from './seguimiento_trabajo/entities/seguimiento-trabajo.entity';
import { VacacionesModule } from './vacaciones/vacaciones.module';
import { CalificacionModule } from './calificacion/calificacion.module';

import { Vacacion } from './vacaciones/entities/vacacion.entity';
import { Calificacion } from './calificacion/entities/calificacion.entity';
import { PagosDoctoresModule } from './pagos_doctores/pagos_doctores.module';
import { PagosDoctores } from './pagos_doctores/entities/pagos_doctores.entity';
import { PagosDetalleDoctores } from './pagos_doctores/entities/pagos-detalle-doctores.entity';

import { PropuestasModule } from './propuestas/propuestas.module';
import { Propuesta } from './propuestas/entities/propuesta.entity';
import { PropuestaDetalle } from './propuestas/entities/propuesta-detalle.entity';
import { UtilidadesModule } from './utilidades/utilidades.module';
import { RecetaModule } from './receta/receta.module';
import { Receta } from './receta/entities/receta.entity';
import { RecetaDetalle } from './receta/entities/receta-detalle.entity';

import { RecordatorioModule } from './recordatorio/recordatorio.module';
import { Recordatorio } from './recordatorio/entities/recordatorio.entity';
import { RecordatorioTratamientoModule } from './recordatorio-tratamiento/recordatorio-tratamiento.module';
import { RecordatorioTratamiento } from './recordatorio-tratamiento/entities/recordatorio-tratamiento.entity';
import { RecordatorioPlanModule } from './recordatorio_plan/recordatorio-plan.module';
import { RecordatorioPlan } from './recordatorio_plan/entities/recordatorio-plan.entity';
import { ContactosModule } from './contactos/contactos.module';
import { Contacto } from './contactos/entities/contacto.entity';
import { BackupModule } from './backup/backup.module';
import { FirmasModule } from './firmas/firmas.module';
import { FirmaDigital } from './firmas/entities/firma-digital.entity';
import { ClinicasModule } from './clinicas/clinicas.module';
import { Clinica } from './clinicas/entities/clinica.entity';
import { Sucursal } from './clinicas/entities/sucursal.entity';
import { StorageModule } from './common/storage/storage.module';
import { WhatsappSession } from './chatbot/entities/whatsapp-session.entity';
import { OtrosIngresosModule } from './otros-ingresos/otros-ingresos.module';
import { OtrosIngresos } from './otros-ingresos/entities/otros-ingresos.entity';

import { ProductosComercialesModule } from './productos_comerciales/productos_comerciales.module';
import { VentasProductosModule } from './ventas_productos/ventas_productos.module';
import { ProductoComercial } from './productos_comerciales/entities/producto_comercial.entity';
import { VentaProducto } from './ventas_productos/entities/venta-producto.entity';
import { VentaProductoDetalle } from './ventas_productos/entities/venta-producto-detalle.entity';

import { CompraProducto } from './compras_productos/entities/compra-producto.entity';
import { CompraProductoDetalle } from './compras_productos/entities/compra-producto-detalle.entity';
import { ComprasProductosModule } from './compras_productos/compras_productos.module';
import { LoteProducto } from './productos_comerciales/entities/lote-producto.entity';
import { VentaProductoDetalleLote } from './ventas_productos/entities/venta-producto-detalle-lote.entity';


@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgrespg',
      database: process.env.DB_DATABASE || 'indent_clinic',
      logging: process.env.NODE_ENV !== 'production',
      synchronize: process.env.NODE_ENV !== 'production', // Caution: only true in dev
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      entities: [
        User,
        Doctor,
        Proveedor,
        Personal,
        PersonalTipo,
        Especialidad,
        Arancel,
        Egreso,
        Laboratorio,
        PrecioLaboratorio,
        Paciente,
        PagoTablet,

        FichaMedica,
        Proforma,
        ProformaDetalle,
        ProformaImagen,
        Propuesta,
        PropuestaDetalle,
        HistoriaClinica,
        Pago,
        ComisionTarjeta,
        Agenda,
        GastosFijos,
        PagosGastosFijos,

        Correo,
        FormaPago,
        GrupoInventario,
        Inventario,
        EgresoInventario,
        Pedidos,
        PedidosDetalle,
        PagosPedidos,
        ChatbotIntento,
        TrabajoLaboratorio,
        Cubeta,
        PagoLaboratorio,
        SeguimientoTrabajo,
        Vacacion,
        Calificacion,
        RecetaDetalle,
        PagosDetalleDoctores,
        PagosDoctores,
        Receta,

        Recordatorio,
        RecordatorioTratamiento,
        RecordatorioPlan,
        Contacto,
        FirmaDigital,
        Clinica,
        Sucursal,
        WhatsappSession,
        OtrosIngresos,
        ProductoComercial,
        VentaProducto,
        VentaProductoDetalle,
        CompraProducto,
        CompraProductoDetalle,
        LoteProducto,
        VentaProductoDetalleLote,

      ],
      migrations: [__dirname + '/db/migrations/*{.ts,.js}'],
      migrationsRun: true,
    }),
    UsersModule,
    AuthModule,
    DoctorsModule,
    ProveedoresModule,
    PersonalModule,
    PersonalTipoModule,
    EspecialidadModule,
    ArancelModule,
    EgresosModule,
    LaboratoriosModule,
    PreciosLaboratoriosModule,
    PacientesModule,
    PagosTabletModule,

    FichaMedicaModule,
    ProformasModule,
    PropuestasModule,
    HistoriaClinicaModule,
    PagosModule,
    ComisionTarjetaModule,
    AgendaModule,
    ChatModule,
    GastosFijosModule,
    PagosGastosFijosModule,

    CorreosModule,
    FormaPagoModule,
    GrupoInventarioModule,
    InventarioModule,
    EgresoInventarioModule,
    PedidosModule,
    PagosPedidosModule,
    PagosDoctoresModule,
    ChatbotModule,
    PacientesDeudoresModule,
    TrabajosLaboratoriosModule,
    CubetasModule,
    PagosLaboratoriosModule,
    SeguimientoTrabajoModule,
    VacacionesModule,
    CalificacionModule,
    UtilidadesModule,
    RecetaModule,

    RecordatorioModule,
    RecordatorioTratamientoModule,
    RecordatorioPlanModule,
    OtrosIngresosModule,
    ContactosModule,
    BackupModule,
    FirmasModule,
    ClinicasModule,
    StorageModule,
    ProductosComercialesModule,
    VentasProductosModule,
    ComprasProductosModule,

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
