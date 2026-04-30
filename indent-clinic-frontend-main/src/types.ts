export interface Clinica {
    id: number;
    nombre: string;
    direccion?: string;
    telefono?: string;
    activo: boolean;
    horario_atencion?: string;
    monedaDefault?: string;
    logo?: string;
}

export interface Sucursal {
    id: number;
    nombre: string;
    direccion: string;
    horario: string;
    telefono: string;
    latitud?: number;
    longitud?: number;
    google_maps_url?: string;
    es_principal?: boolean;
    clinicaId?: number;
}

export interface SeguimientoTrabajo {
    id: number;
    envio_retorno: 'Envio' | 'Retorno';
    fecha: string;
    observaciones: string;
    trabajoLaboratorioId: number;
}

export interface GrupoInventario {
    id: number;
    grupo: string;
    estado: string;
}

export interface RecordatorioTratamiento {
    id: number;
    historiaClinicaId: number;
    historiaClinica?: HistoriaClinica;
    fechaRecordatorio: string;
    mensaje: string;
    dias: number;
    estado: string;
    createdAt: string;
    updatedAt: string;
}

export interface RecordatorioPlan {
    id: number;
    proformaId: number;
    proforma?: Proforma;
    fechaRecordatorio: string;
    dias: number;
    mensaje: string;
    estado: string;
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: number;
    name: string;
    email: string;
    estado: string;
    password?: string; // Optional for list view
    foto?: string;
    permisos?: string[]; // Array of denied module IDs
}

export interface CreateUserDto {
    name: string;
    email: string;
    password: string;
    estado: string;
    foto?: string;
    permisos?: string[];
}

export interface Inventario {
    id: number;
    descripcion: string;
    cantidad_existente: number;
    stock_minimo: number;
    estado: string; // 'Activo' | 'Inactivo'
    idespecialidad: number;
    idgrupo_inventario: number;
    especialidad?: Especialidad;
    grupoInventario?: GrupoInventario;
    egresosInventario?: EgresoInventario[];
    clinicaId?: number;
    clinica?: Clinica;
}

export interface EgresoInventario {
    id: number;
    inventarioId: number;
    inventario?: Inventario;
    fecha: string;
    cantidad: number;
    fecha_vencimiento: string;
    clinicaId?: number;
}

export interface Doctor {
    id: number;
    paterno: string;
    materno: string;
    nombre: string;
    celular: string;
    direccion: string;
    estado: string;
    idEspecialidad?: number;
    especialidad?: Especialidad;
}

export interface Proveedor {
    id: number;
    proveedor: string;
    celular: string;
    direccion: string;
    email: string;
    nombre_contacto: string;
    celular_contacto: string;
    estado: string;
}

export interface Personal {
    id: number;
    paterno: string;
    materno: string;
    nombre: string;
    ci: string;
    direccion: string;
    telefono: string;
    celular: string;
    fecha_nacimiento: string;
    fecha_ingreso: string;
    personal_tipo_id?: number;
    personalTipo?: PersonalTipo;
    estado: string;
    fecha_baja?: string;
    clinicaId?: number;
    clinica?: Clinica;
}

export interface Especialidad {
    id: number;
    especialidad: string;
    estado: string;
}

export interface Arancel {
    id: number;
    detalle: string;
    precio: number;
    precio_sin_seguro?: number;
    precio_gold?: number;
    precio_silver?: number;
    precio_odontologico?: number;
    estado: string;
    idEspecialidad: number;
    especialidad?: Especialidad;
    clinicaId?: number;
    clinica?: Clinica;
    moneda?: string;
}

export interface FormaPago {
    id: number;
    forma_pago: string;
    estado: string;
}

export interface Egreso {
    id: number;
    fecha: string;

    detalle: string;
    monto: number;
    moneda: 'Bolivianos' | 'Dólares';
    formaPago?: FormaPago;
    egresoTipo?: { id: number; tipo: string };
    clinicaId?: number;
}

export interface OtrosIngresos {
    id: number;
    fecha: string;
    detalle: string;
    monto: number;
    moneda: 'Bolivianos' | 'Dólares';
    formaPagoId: number;
    formaPago?: FormaPago;
    clinicaId?: number;
    clinica?: Clinica;
}

export interface Laboratorio {
    id: number;
    laboratorio: string;
    celular: string;
    telefono: string;
    direccion: string;
    email: string;
    banco: string;
    numero_cuenta: string;
    estado: string;
}

export interface PrecioLaboratorio {
    id: number;
    detalle: string;
    precio: number;
    idLaboratorio: number;
    laboratorio?: Laboratorio;
    estado: string;
}

export interface Categoria {
    id: number;
    nombre: string;
    color: string;
}

export interface Paciente {
    id: number;
    fecha: string;
    paterno: string;
    materno: string;
    nombre: string;
    direccion: string;
    telefono: string;
    celular: string;
    email: string;
    casilla: string;
    profesion: string;
    estado_civil: string;
    direccion_oficina: string;
    telefono_oficina: string;
    fecha_nacimiento: string;
    sexo: string;
    seguro_medico: string;
    poliza: string;
    fecha_vencimiento?: string;
    recomendado: string;
    responsable: string;
    parentesco: string;
    direccion_responsable: string;
    telefono_responsable: string;

    motivo?: string;
    nomenclatura?: string;
    estado: string;
    clasificacion?: string;
    categoriaId?: number;
    categoria?: Categoria;
    fichaMedica?: FichaMedica;
    clinicaId?: number;
    clinica?: Clinica;
}

export interface PersonalTipo {
    id: number;
    area: string;
    estado: string;
    created_at: string;
    updated_at: string;
}

export interface UpdateUserDto extends Partial<CreateUserDto> { }



export interface ProformaDetalle {
    id: number;
    proformaId: number;
    arancelId: number;
    arancel?: Arancel;
    precioUnitario: number;
    piezas: string;
    cantidad: number;
    total: number;
    posible: boolean;
    tipoPrecio?: string;
}

export interface Proforma {
    id: number;
    numero: number;
    pacienteId: number;
    paciente?: Paciente;
    usuarioId: number;
    usuario?: User;
    fecha: string;
    nota: string;
    sub_total: number;
    descuento: number;
    total: number;
    detalles: ProformaDetalle[];
    clinicaId?: number;
    clinica?: Clinica;
    createdAt: string;
    updatedAt: string;
}

export interface HistoriaClinica {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    fecha: string;
    pieza?: string;
    cantidad: number;
    proformaDetalleId?: number;
    proformaDetalle?: ProformaDetalle;
    tratamiento?: string;
    observaciones?: string;
    especialidadId?: number;
    especialidad?: Especialidad;
    doctorId?: number;
    doctor?: Doctor;
    diagnostico?: string;

    estadoTratamiento: string;
    estadoPresupuesto: string;
    proformaId?: number;
    proforma?: Proforma;

    casoClinico: boolean;
    pagado: string;
    cancelado: number;
    precio?: number;
    descuento?: number;
    precioConDescuento?: number;
    firmaPaciente?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Pago {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    fecha: string;
    proformaId?: number;
    proforma?: Proforma;
    monto: number;
    moneda: 'Bolivianos' | 'Dólares';
    tc: number;
    recibo?: string;
    factura?: string;
    formaPago: 'Efectivo' | 'QR' | 'Tarjeta';
    comisionTarjetaId?: number;
    comisionTarjeta?: ComisionTarjeta;
    observaciones?: string;
    formaPagoRel?: FormaPago;
    descuento?: number;
    tratamientosIds?: number[] | string;
    historiaClinicaIds?: number[] | string;
    historiaClinicaId?: number;
    createdAt: string;
    updatedAt: string;
}

export interface ComisionTarjeta {
    id: number;
    redBanco: string;
    monto: number;
    estado: string;
}

export interface Agenda {
    id: number;
    fecha: string;
    hora: string;
    duracion: number;
    pacienteId: number;
    paciente?: Paciente;
    doctorId: number;
    doctor?: Doctor;
    proformaId?: number;
    proforma?: Proforma;
    usuarioId: number;
    usuario?: User;
    fechaAgendado: string;
    estado: string;
    tratamiento?: string;
    observacion?: string;
    sucursalId?: number;
    sucursal?: Sucursal;
    motivoCancelacion?: string;
    doctorDerivaId?: number;
    doctorDeriva?: Doctor;
    clinicaId?: number;
    clinica?: Clinica;
    recordatorioEnviado?: boolean;
}

export interface GastoFijo {
    id: number;

    dia: number;
    anual: boolean;
    mes?: string;
    gasto_fijo: string;
    monto: number;
    moneda: string;
    estado?: string;
    clinicaId?: number;
    clinica?: Clinica;
}

export interface PagoGastoFijo {
    id: number;
    gastoFijoId: number;
    gastoFijo?: GastoFijo;
    fecha: string;
    monto: number;
    moneda: string;
    formaPagoId: number;
    formaPago?: FormaPago;
    observaciones: string;
    createdAt?: string;
    clinicaId?: number;
}



export interface FichaMedica {
    id: number;
    ultima_visita_odontologo?: string;
    motivo_consulta?: string;
    bruxismo: boolean;
    alergia_medicamento: boolean;
    alergia_medicamento_detalle?: string;
    medicamento_72h: boolean;
    medicamento_72h_detalle?: string;
    tratamiento_medico: boolean;
    tratamiento_medico_detalle?: string;
    anestesiado_anteriormente: boolean;
    reaccion_anestesia: boolean;
    reaccion_anestesia_detalle?: string;
    enf_neurologicas: boolean;
    enf_neurologicas_detalle?: string;
    enf_pulmonares: boolean;
    enf_pulmonares_detalle?: string;
    enf_cardiacas: boolean;
    enf_cardiacas_detalle?: string;
    enf_higado: boolean;
    enf_higado_detalle?: string;
    enf_gastricas: boolean;
    enf_gastricas_detalle?: string;
    enf_venereas: boolean;
    enf_venereas_detalle?: string;
    enf_renales: boolean;
    enf_renales_detalle?: string;
    articulaciones: boolean;
    articulaciones_detalle?: string;
    diabetes: boolean;
    diabetes_detalle?: string;
    hipertension: boolean;
    hipotension: boolean;
    anemia: boolean;
    anemia_detalle?: string;
    prueba_vih: boolean;
    prueba_vih_resultado?: string;
    anticonceptivo_hormonal: boolean;
    anticonceptivo_hormonal_detalle?: string;
    posibilidad_embarazo: boolean;
    semana_gestacion?: string;
    cepillado_veces?: string;
    usa_hilo_dental: boolean;
    usa_enjuague: boolean;
    fuma: boolean;
    fuma_cantidad?: string;
    consume_citricos: boolean;
    observaciones?: string;
}



export interface Correo {
    id: number;
    remitente_id: number;
    remitente?: User;
    destinatario_id: number;
    destinatario?: User;
    copia_id?: number;
    copia?: User;
    asunto: string;
    mensaje: string;
    fecha_envio: string;
    leido_destinatario: boolean;
    leido_copia: boolean;
    // Helper property I will use in frontend logic? No, backend sends these raw fields.
}

export interface CreateCorreoDto {
    remitente_id: number;
    destinatario_id: number;
    copia_id?: number;
    asunto: string;
    mensaje: string;
}

export interface PedidosDetalle {
    id: number;
    idpedidos: number;
    idinventario: number;
    cantidad: number;
    precio_unitario: number;
    fecha_vencimiento: string;
    inventario?: Inventario;
}

export interface Pedidos {
    id: number;
    fecha: string;
    idproveedor: number;
    Sub_Total: number;
    Descuento: number;
    Total: number;
    Observaciones: string;
    Pagado: boolean;
    proveedor?: Proveedor;
    detalles?: PedidosDetalle[];
    clinicaId?: number;
}

export interface PagosPedidos {
    id: number;
    fecha: string;
    idPedido: number;
    pedido?: Pedidos;
    monto: number;
    factura?: string;
    recibo?: string;
    forma_pago: string;
}

export interface Cubeta {
    id: number;
    codigo: string;
    descripcion: string;
    dentro_fuera: string;
    estado: string;
}

export interface TrabajoLaboratorio {
    id: number;
    idLaboratorio: number;
    laboratorio?: Laboratorio;
    idPaciente: number;
    paciente?: Paciente;
    idprecios_laboratorios: number;
    precioLaboratorio?: PrecioLaboratorio;
    fecha: string;
    pieza: string;
    cantidad: number;
    fecha_pedido: string;
    color: string;
    estado: string;
    cita: string;
    observacion: string;
    fecha_terminado?: string;
    pagado: string;
    precio_unitario: number;
    total: number;
    resaltar: string;
    idCubeta?: number;
    cubeta?: Cubeta;
    clinicaId?: number;
    idDoctor?: number;
    doctor?: Doctor;
    idHistoriaClinica?: number;
    historiaClinica?: HistoriaClinica;
}

export interface PropuestaDetalle {
    id: number;
    propuestaId: number;
    letra?: string;
    arancelId: number;
    arancel?: Arancel;
    precioUnitario: number;
    tc: number;
    piezas: string;
    cantidad: number;
    subTotal: number;
    descuento: number;
    total: number;
    posible: boolean;
}

export interface Propuesta {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    numero: number;
    letra?: string;
    fecha: string;
    total: number;
    nota: string;
    usuarioId: number;
    usuario?: User;
    detalles: PropuestaDetalle[];
}

export interface Calificacion {
    id: number;
    personalId: number;
    personal?: Personal;
    pacienteId: number;
    paciente?: Paciente;
    consultorio: number;
    calificacion: 'Malo' | 'Regular' | 'Bueno';
    fecha: string;
    observaciones?: string;
    evaluadorId: number;
    evaluador?: User;
    createdAt?: string;
    updatedAt?: string;
}

export interface Receta {
    id: number;
    pacienteId: number;
    paciente?: Paciente;
    userId: number;
    user?: { id: number; name: string };
    fecha: string;
    medicamentos: string;
    indicaciones: string;
    detalles?: RecetaDetalle[];
}

export interface RecetaDetalle {
    id: number;
    recetaId: number;
    medicamento: string;
    cantidad: string;
    indicacion: string;
}



export interface Recordatorio {
    id: number;
    tipo: 'personal' | 'consultorio';
    fecha: string;
    hora: string;
    mensaje: string;
    repetir: 'Mensual' | 'Anual' | 'Solo una vez';
    estado: 'activo' | 'inactivo';
    usuarioId?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Contacto {
    id: number;
    contacto: string;
    celular?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    estado: 'activo' | 'inactivo';
    createdAt?: string;
    updatedAt?: string;
}

export interface BackupInfo {
    filename: string;
    size: number;
    createdAt: string;
    path: string;
}

export interface ProductoComercial {
    id: number;
    nombre: string;
    precio_venta: number;
    costo: number;
    stock_actual: number;
    stock_minimo: number;
    clinicaId: number | null;
    clinica?: Clinica;
    estado: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface VentaProductoDetalle {
    id: number;
    ventaId: number;
    productoId: number;
    producto?: ProductoComercial;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}

export interface VentaProducto {
    id: number;
    fecha: string;
    personalId: number;
    personal?: Personal;
    pacienteId: number;
    paciente?: Paciente;
    total: number;
    comision_porcentaje: number;
    comision_monto: number;
    formaPagoId?: number;
    formaPago?: FormaPago;
    clinicaId: number | null;
    clinica?: Clinica;
    detalles?: VentaProductoDetalle[];
    observaciones?: string | null;
    comision_pagada?: boolean;
    createdAt?: string;
    updatedAt?: string;
}


export interface CompraProductoDetalle {
    id: number;
    compraId: number;
    productoId: number;
    producto?: ProductoComercial;
    cantidad: number;
    costo_unitario: number;
    subtotal: number;
    numero_lote?: string;
    fecha_vencimiento?: string;
}

export interface CompraProducto {
    id: number;
    fecha: string;
    proveedorId: number;
    proveedor?: Proveedor;
    total: number;
    pagada: boolean;
    tieneVentas?: boolean;
    fecha_pago?: string;
    observaciones?: string | null;
    clinicaId: number | null;
    clinica?: Clinica;
    detalles?: CompraProductoDetalle[];
    createdAt?: string;
    updatedAt?: string;
}


