import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import UserList from './components/UserList';
import Home from './components/Home';
import DoctorList from './components/DoctorList';
import ProveedorList from './components/ProveedorList';
import PersonalList from './components/PersonalList';
import EspecialidadList from './components/EspecialidadList';
import ArancelList from './components/ArancelList';
import EgresoList from './components/EgresoList';
import OtrosIngresosList from './components/OtrosIngresosList';
import LaboratorioList from './components/LaboratorioList';
import PrecioLaboratorioList from './components/PrecioLaboratorioList';
import TrabajosLaboratoriosList from './components/TrabajosLaboratoriosList';
import TrabajosLaboratoriosForm from './components/TrabajosLaboratoriosForm';
import PagosLaboratoriosList from './components/PagosLaboratoriosList';
import SeguimientoTrabajoComponent from './components/SeguimientoTrabajo';
import { ErrorBoundary } from './components/ErrorBoundary';
import PacienteList from './components/PacienteList';
import PacienteForm from './components/PacienteForm';
import PublicPacienteForm from './components/PublicPacienteForm';
import PublicPagoForm from './components/PublicPagoForm';
import PersonalTipoList from './components/PersonalTipoList';
import PresupuestoList from './components/PresupuestoList';
import PresupuestoForm from './components/PresupuestoForm';
import HistoriaClinica from './components/HistoriaClinica';
import PagosForm from './components/PagosForm';
import ComisionTarjetaList from './components/ComisionTarjetaList';
import PagosPedidosList from './components/PagosPedidosList';
import GastosFijosList from './components/GastosFijosList';
import AgendaView from './components/AgendaView';
import CorreosList from './components/CorreosList';
import Configuration from './components/Configuration';
import ChatbotConfig from './components/ChatbotConfig';
import FormaPagoList from './components/FormaPagoList';
import GrupoInventarioList from './components/GrupoInventarioList';
import InventarioList from './components/InventarioList';
import VacacionesList from './components/VacacionesList';
import CalificacionList from './components/CalificacionList';
import PedidosList from './components/PedidosList';
import PacientesDeudores from './components/PacientesDeudores';
import PacientesPendientes from './components/PacientesPendientes';
import CubetasList from './components/CubetasList';
import ImagenesPacientesList from './components/ImagenesPacientesList';
import { ChatProvider } from './context/ChatContext';
import { CorreosProvider } from './context/CorreosContext';
import DeudasLaboratorios from './components/DeudasLaboratorios';
import DeudasPedidos from './components/DeudasPedidos';
import PagosDoctoresList from './components/PagosDoctoresList';
import PagosDoctoresForm from './components/PagosDoctoresForm';
import PropuestasList from './components/PropuestasList';
import PropuestasForm from './components/PropuestasForm';
import ProtectedRoute from './components/ProtectedRoute';
import HojaDiaria from './components/HojaDiaria';
import Utilidades from './components/Utilidades';
import Estadisticas from './components/Estadisticas';
import EstadisticasDoctores from './components/EstadisticasDoctores';
import EstadisticasEspecialidades from './components/EstadisticasEspecialidades';
import EstadisticasPacientesNuevos from './components/EstadisticasPacientesNuevos';

import EstadisticasProductos from './components/EstadisticasProductos';
import EstadisticasUtilidades from './components/EstadisticasUtilidades';
import RecetarioList from './components/RecetarioList';
import RecordatorioList from './components/RecordatorioList';
import ContactosList from './components/ContactosList';
import BackupManager from './components/BackupManager';
import CambiarPassword from './components/CambiarPassword';

import ClinicasList from './components/ClinicasList';
import ProductosComercialesList from './components/ProductosComercialesList';
import VentaProductoForm from './components/VentaProductoForm';
import CompraProductoComercialList from './components/CompraProductoComercialList';
import ReporteComisiones from './components/ReporteComisiones';
import PacientePerfil from './components/PacientePerfil';
import PacienteTabCitas from './components/PacienteTabCitas';
import PacienteTabFicha from './components/PacienteTabFicha';
import PacienteTabPagos from './components/PacienteTabPagos';
import PacienteTabImagenes from './components/PacienteTabImagenes';

import { ThemeProvider } from './context/ThemeContext';
import IdleTimeoutHandler from './components/IdleTimeoutHandler';

const RootRedirect = () => {
    const user = localStorage.getItem('user');
    return user ? <Home /> : <Navigate to="/login" replace />;
};

function App() {
    return (
        <Router>
            <IdleTimeoutHandler />
            <ChatProvider>
                <CorreosProvider>
                    <ThemeProvider>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/registro-pago/:idOrSlug?" element={<PublicPagoForm />} />
                            <Route path="/registro-paciente/:idOrSlug?" element={<PublicPacienteForm />} />
                            <Route path="/" element={<Layout />}>
                                <Route index element={<RootRedirect />} />

                                {/* Agenda */}
                                <Route element={<ProtectedRoute moduleId="agenda" />}>
                                    <Route path="/agenda" element={<AgendaView />} />
                                </Route>

                                {/* Usuarios & Configuration */}
                                <Route element={<ProtectedRoute moduleId="usuarios" />}>
                                    <Route path="/users" element={<UserList />} />
                                </Route>
                                <Route element={<ProtectedRoute moduleId="configuracion" />}>
                                    <Route path="/configuration" element={<Configuration />} />
                                    <Route path="/configuration/chatbot" element={<ChatbotConfig />} />
                                    <Route element={<ProtectedRoute moduleId="config-backup" />}>
                                        <Route path="/backup" element={<BackupManager />} />
                                    </Route>
                                    <Route path="/correos" element={<CorreosList />} />
                                </Route>

                                {/* Clínicas */}
                                <Route element={<ProtectedRoute moduleId="config-clinicas" />}>
                                    <Route path="/clinicas" element={<ClinicasList />} />
                                </Route>

                                {/* Doctores & Especialidades */}
                                <Route element={<ProtectedRoute moduleId="doctores" />}>
                                    <Route element={<ProtectedRoute moduleId="doctores-registro" />}>
                                        <Route path="/doctors" element={<DoctorList />} />
                                    </Route>
                                    <Route path="/especialidad" element={<EspecialidadList />} />
                                    <Route element={<ProtectedRoute moduleId="pagos-doctores" />}>
                                        <Route path="/pagos-doctores" element={<PagosDoctoresList />} />
                                        <Route path="/pagos-doctores/create" element={<PagosDoctoresForm />} />
                                        <Route path="/pagos-doctores/edit/:id" element={<PagosDoctoresForm />} />
                                    </Route>
                                </Route>


                                {/* Providers / ADMs */}
                                <Route element={<ProtectedRoute moduleId="proveedores" />}>
                                    <Route element={<ProtectedRoute moduleId="proveedores-registro" />}>
                                        <Route path="/proveedores" element={<ProveedorList />} />
                                    </Route>
                                </Route>

                                {/* Personal */}
                                <Route element={<ProtectedRoute moduleId="personal" />}>
                                    <Route element={<ProtectedRoute moduleId="personal-registro" />}>
                                        <Route path="/personal" element={<PersonalList />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="vacaciones" />}>
                                        <Route path="/vacaciones" element={<VacacionesList />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="calificacion" />}>
                                        <Route path="/calificacion" element={<CalificacionList />} />
                                    </Route>
                                </Route>

                                {/* Arancel */}
                                <Route element={<ProtectedRoute moduleId="arancel" />}>
                                    <Route path="/arancel" element={<ArancelList />} />
                                </Route>

                                {/* Egresos & Gastos */}
                                <Route element={<ProtectedRoute moduleId="otros-ingresos" />}>
                                    <Route path="/otros-ingresos" element={<ErrorBoundary><OtrosIngresosList /></ErrorBoundary>} />
                                </Route>
                                <Route element={<ProtectedRoute moduleId="egresos" />}>
                                    <Route path="/egresos" element={<ErrorBoundary><EgresoList /></ErrorBoundary>} />
                                </Route>
                                <Route element={<ProtectedRoute moduleId="gastos" />}>
                                    <Route path="/gastos-fijos" element={<ErrorBoundary><GastosFijosList /></ErrorBoundary>} />
                                </Route>

                                {/* Laboratorios */}
                                <Route element={<ProtectedRoute moduleId="laboratorios" />}>
                                    <Route element={<ProtectedRoute moduleId="laboratorios-registro" />}>
                                        <Route path="/laboratorios" element={<LaboratorioList />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="precios-laboratorios" />}>
                                        <Route path="/precios-laboratorios" element={<PrecioLaboratorioList />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="trabajos-laboratorios" />}>
                                        <Route path="/trabajos-laboratorios" element={<TrabajosLaboratoriosList />} />
                                        <Route path="/trabajos-laboratorios/nuevo" element={<TrabajosLaboratoriosForm />} />
                                        <Route path="/trabajos-laboratorios/editar/:id" element={<TrabajosLaboratoriosForm />} />
                                        <Route path="/trabajos-laboratorios/seguimiento/:workId" element={<SeguimientoTrabajoComponent />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="pagos-laboratorios" />}>
                                        <Route path="/pagos-laboratorios" element={<PagosLaboratoriosList />} />
                                        <Route path="/pagos-laboratorios/deudas" element={<DeudasLaboratorios />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="cubetas" />}>
                                        <Route path="/cubetas" element={<CubetasList />} />
                                    </Route>
                                </Route>

                                {/* Pacientes */}
                                <Route element={<ProtectedRoute moduleId="pacientes" />}>
                                    <Route element={<ProtectedRoute moduleId="pacientes-registro" />}>
                                        <Route path="/pacientes" element={<PacienteList />} />
                                        <Route path="/pacientes/create" element={<PacienteForm />} />
                                        <Route path="/pacientes/edit/:id" element={<PacienteForm />} />
                                        <Route path="/personal-tipo" element={<PersonalTipoList />} />

                                        {/* Mundo del Paciente - Layout con tabs */}
                                        <Route path="/pacientes/:id" element={<PacientePerfil />}>
                                            <Route path="citas" element={<PacienteTabCitas />} />
                                            <Route path="ficha" element={<PacienteTabFicha />} />
                                            <Route path="historia-clinica" element={<HistoriaClinica />} />
                                            <Route element={<ProtectedRoute moduleId="pagos" />}>
                                                <Route path="pagos" element={<PacienteTabPagos />} />
                                            </Route>
                                            <Route path="imagenes" element={<PacienteTabImagenes />} />
                                        </Route>
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="pacientes-pendientes" />}>
                                        <Route path="/pacientes-pendientes" element={<PacientesPendientes />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="pacientes-deudores" />}>
                                        <Route path="/pacientes-deudores" element={<PacientesDeudores />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="recetario" />}>
                                        <Route path="/recetario" element={<RecetarioList />} />
                                    </Route>
                                    <Route element={<ProtectedRoute moduleId="imagenes-pacientes" />}>
                                        <Route path="/imagenes-pacientes" element={<ImagenesPacientesList />} />
                                    </Route>

                                    {/* Presupuestos & Propuestas sub-routes (siguen funcionando independientemente) */}
                                    <Route element={<ProtectedRoute moduleId="presupuestos" />}>
                                        <Route path="/pacientes/:id" element={<PacientePerfil />}>
                                            <Route path="presupuestos" element={<PresupuestoList />} />
                                            <Route path="propuestas" element={<PropuestasList />} />
                                        </Route>
                                        <Route path="/pacientes/:id/presupuestos/create" element={<PresupuestoForm />} />
                                        <Route path="/pacientes/:id/presupuestos/edit/:proformaId" element={<PresupuestoForm />} />
                                        <Route path="/pacientes/:id/presupuestos/view/:proformaId" element={<PresupuestoForm />} />
                                        <Route path="/pacientes/:id/propuestas/create" element={<PropuestasForm />} />
                                        <Route path="/pacientes/:id/propuestas/edit/:propuestaId" element={<PropuestasForm />} />
                                        <Route path="/pacientes/:id/propuestas/view/:propuestaId" element={<PropuestasForm />} />
                                    </Route>
                                </Route>

                                {/* Pedidos */}
                                <Route element={<ProtectedRoute moduleId="pedidos" />}>
                                    <Route path="/pedidos" element={<PedidosList />} />
                                    <Route path="/pedidos/deudas" element={<DeudasPedidos />} />
                                </Route>

                                {/* Pagos Config */}
                                <Route element={<ProtectedRoute moduleId="pagos" />}>
                                    <Route path="/pagos-pedidos" element={<PagosPedidosList />} />
                                    <Route path="/comision-tarjeta" element={<ComisionTarjetaList />} />
                                    <Route path="/forma-pago" element={<FormaPagoList />} />
                                </Route>

                                {/* Inventario */}
                                <Route element={<ProtectedRoute moduleId="inventario" />}>
                                    <Route path="/grupo-inventario" element={<GrupoInventarioList />} />
                                    <Route path="/inventario" element={<InventarioList />} />
                                    <Route path="/pedidos" element={<PedidosList />} />
                                    <Route path="/pedidos/deudas" element={<DeudasPedidos />} />
                                </Route>

                                {/* Nuevos Módulos */}
                                <Route element={<ProtectedRoute moduleId="hoja-diaria" />}>
                                    <Route path="/hoja-diaria" element={<HojaDiaria />} />
                                </Route>
                                <Route element={<ProtectedRoute moduleId="utilidades" />}>
                                    <Route path="/utilidades" element={<Utilidades />} />
                                </Route>
                                <Route path="/estadisticas" element={<Estadisticas />} />
                                <Route path="/estadisticas/doctores" element={<EstadisticasDoctores />} />
                                <Route path="/estadisticas/especialidades" element={<EstadisticasEspecialidades />} />
                                <Route path="/estadisticas/pacientes-nuevos" element={<EstadisticasPacientesNuevos />} />
                                <Route path="/estadisticas/productos" element={<EstadisticasProductos />} />
                                <Route path="/estadisticas/utilidades" element={<EstadisticasUtilidades />} />

                                {/* Ventas Comerciales */}
                                <Route element={<ProtectedRoute moduleId="ventas-comerciales" />}>
                                    <Route path="/productos-comerciales" element={<ProductosComercialesList />} />
                                    <Route path="/ventas-comerciales" element={<VentaProductoForm />} />
                                    <Route path="/compras-productos" element={<CompraProductoComercialList />} />
                                    <Route path="/reporte-comisiones" element={<ReporteComisiones />} />
                                </Route>

                                {/* Recordatorios */}
                                <Route path="/recordatorio" element={<RecordatorioList />} />

                                {/* Contactos */}
                                <Route path="/contactos" element={<ContactosList />} />

                                {/* Cambiar Contraseña */}
                                <Route element={<ProtectedRoute moduleId="cambiar-password" />}>
                                    <Route path="/cambiar-password" element={<CambiarPassword />} />
                                </Route>
                            </Route>

                        </Routes>
                    </ThemeProvider>
                </CorreosProvider>
            </ChatProvider>
        </Router>
    );
}

export default App;
