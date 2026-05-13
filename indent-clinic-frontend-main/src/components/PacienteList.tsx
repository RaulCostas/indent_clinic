import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { Paciente } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Pagination from './Pagination';
import ManualModal, { type ManualSection } from './ManualModal';
import { formatDate } from '../utils/dateUtils';
import Swal from 'sweetalert2';
import { FileText, Download, Printer, Users, CheckCircle } from 'lucide-react';
import SignatureModal from './SignatureModal';
import { useClinica } from '../context/ClinicaContext';
import PacienteViewModal from './PacienteViewModal';
import SignatureThumbnail from './SignatureThumbnail';


const PacienteList: React.FC = () => {
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [searchTerm, setSearchTerm] = useState(() => sessionStorage.getItem('pacientes_search') || '');
    const [currentPage, setCurrentPage] = useState(() => Number(sessionStorage.getItem('pacientes_page')) || 1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalRecords, setTotalRecords] = useState(0);
    const [showManual, setShowManual] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedPacienteIdForView, setSelectedPacienteIdForView] = useState<number | null>(null);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [selectedPacienteIdForSignature, setSelectedPacienteIdForSignature] = useState<number | null>(null);
    const limit = 10;
    const navigate = useNavigate();
    const { clinicaSeleccionada } = useClinica();

    const manualSections: ManualSection[] = [
        {
            title: 'Gestión de Pacientes',
            content: 'Desde esta pantalla puede administrar todo el registro de pacientes de la clínica.'
        },
        {
            title: 'Agregar Paciente',
            content: 'Use el botón azul "+ Nuevo Paciente" para registrar una nueva ficha. Es importante completar los datos personales y de contacto.'
        },
        {
            title: 'Dar de Baja y Reactivar',
            content: 'Use el botón de lápiz (amarillo) para modificar datos personales. Para pacientes activos, el botón rojo (papelera) cambia el estado a "Inactivo". Para pacientes inactivos, aparece un botón verde (check) que permite reactivarlos a estado "Activo".'
        },
        {
            title: 'Novedades y Atajos',
            content: '• Atajos de Impresión: Ahora puede exportar directamente la lista filtrada a Excel o PDF para reportes externos.'
        }
    ];

    const calcularEdad = (fecha_nacimiento: string | undefined): string => {
        if (!fecha_nacimiento) return '';
        const hoy = new Date();
        const nacimiento = new Date(fecha_nacimiento);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
        return `${edad} años`;
    };

    const formatCelular = (celular: string) => {
        if (!celular) return '';
        const countryCodes = ['+591', '+54', '+55', '+56', '+51', '+595', '+598', '+57', '+52', '+34', '+1'];
        const code = countryCodes.find(c => celular.startsWith(c));
        if (code) {
            const number = celular.substring(code.length);
            return `(${code}) ${number}`;
        }
        return celular;
    };


    useEffect(() => {
        // Resetear a la página 1 cuando se cambia la clínica desde el selector global
        setCurrentPage(1);
        sessionStorage.setItem('pacientes_page', '1');
    }, [clinicaSeleccionada]);

    useEffect(() => {
        fetchPacientes();
    }, [searchTerm, currentPage, clinicaSeleccionada]);

    const fetchPacientes = async () => {
        try {
            const clinicaParam = clinicaSeleccionada ? `&clinicaId=${clinicaSeleccionada}` : '';
            const response = await api.get(`/pacientes?page=${currentPage}&limit=${limit}&search=${searchTerm}${clinicaParam}`);
            setPacientes(Array.isArray(response.data.data) ? response.data.data : []);
            setTotalPages(response.data.totalPages || 0);
            setTotalRecords(response.data.total || 0);
        } catch (error) {
            console.error('Error fetching pacientes:', error);
            setPacientes([]);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Dar de baja paciente?',
            text: 'El paciente pasará a estado Inactivo sin eliminar el registro de la base de datos.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, dar de baja',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/pacientes/${id}`, { estado: 'inactivo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Paciente dado de baja!',
                    text: 'El estado del paciente ha sido cambiado a Inactivo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchPacientes();
            } catch (error) {
                console.error('Error al dar de baja paciente:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo dar de baja el paciente'
                });
            }
        }
    };

    const handleReactivate = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Reactivar paciente?',
            text: 'El paciente volverá a estado Activo.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, reactivar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await api.patch(`/pacientes/${id}`, { estado: 'activo' });
                await Swal.fire({
                    icon: 'success',
                    title: '¡Paciente reactivado!',
                    text: 'El estado del paciente ha sido cambiado a Activo.',
                    showConfirmButton: false,
                    timer: 1500
                });
                fetchPacientes();
            } catch (error) {
                console.error('Error al reactivar paciente:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo reactivar el paciente'
                });
            }
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        sessionStorage.setItem('pacientes_search', value);
        setCurrentPage(1);
        sessionStorage.setItem('pacientes_page', '1');
    };

    const handleClearSearch = () => {
        setSearchTerm('');
        sessionStorage.removeItem('pacientes_search');
        setCurrentPage(1);
        sessionStorage.setItem('pacientes_page', '1');
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            sessionStorage.setItem('pacientes_page', String(newPage));
        }
    };

    const exportToExcel = async () => {
        try {
            Swal.fire({
                title: 'Generando Excel...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const clinicaParam = clinicaSeleccionada ? `&clinicaId=${clinicaSeleccionada}` : '';
            const response = await api.get(`/pacientes?page=1&limit=9999&search=${searchTerm}${clinicaParam}`);
            const allPacientes = Array.isArray(response.data.data) ? response.data.data : [];

            const dataToExport = allPacientes.map((p: any) => ({
                Paciente: `${p.nombre} ${p.paterno} ${p.materno || ''}`.trim(),
                'Fecha de nacimiento': formatDate(p.fecha_nacimiento),
                Celular: p.celular,
                Seguro: p.seguro_medico || '-',
                'Vencimiento Seguro': p.fecha_vencimiento ? formatDate(p.fecha_vencimiento) : '-',
                Direccion: p.direccion || '-',
                Correo: p.email || '-',
                Estado: p.estado === 'activo' ? 'Activo' : 'Inactivo'
            }));
            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
            XLSX.writeFile(wb, "pacientes.xlsx");
            Swal.close();
        } catch (error) {
            console.error('Error generating Excel:', error);
            Swal.fire('Error', 'No se pudo generar el Excel', 'error');
        }
    };

    const exportToPDF = async () => {
        try {
            // Show loading alert
            Swal.fire({
                title: 'Generando PDF...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Fetch ALL records for PDF
            const response = await api.get(`/pacientes?page=1&limit=9999&search=${searchTerm}`);
            const allPacientes = Array.isArray(response.data.data) ? response.data.data : [];

            const doc = new jsPDF();
            doc.text("Lista de Pacientes", 20, 10);
            const tableColumn = ["Paciente", "Fecha de nacimiento", "Celular", "Seguro", "Venc. Seguro", "Dirección", "Correo", "Estado"];
            const tableRows = allPacientes.map((p: any) => [
                `${p.nombre} ${p.paterno} ${p.materno || ''}`.trim(),
                formatDate(p.fecha_nacimiento),
                p.celular,
                p.seguro_medico || '-',
                p.fecha_vencimiento ? formatDate(p.fecha_vencimiento) : '-',
                p.direccion || '-',
                p.email || '-',
                p.estado === 'activo' ? 'Activo' : 'Inactivo'
            ]);

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 20,
            });
            doc.save("pacientes.pdf");
            Swal.close();
        } catch (error) {
            console.error('Error generating PDF:', error);
            Swal.fire('Error', 'No se pudo generar el PDF', 'error');
        }
    };


    const handlePrint = async () => {
        try {
            const clinicaParam = clinicaSeleccionada ? `&clinicaId=${clinicaSeleccionada}` : '';
            const response = await api.get(`/pacientes?page=1&limit=9999&search=${searchTerm}${clinicaParam}`);
            const allPacientes = Array.isArray(response.data.data) ? response.data.data : [];

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) {
                document.body.removeChild(iframe);
                return;
            }

            // Fetch signatures for all signed patients to show in print
            const signedPacientes = allPacientes.filter((p: any) => p.tieneFirmaFC);
            const signaturesMap = new Map<number, string>();
            
            if (signedPacientes.length > 0) {
                Swal.fire({
                    title: 'Preparando firmas...',
                    text: 'Cargando imágenes de firmas para el reporte',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                await Promise.all(signedPacientes.map(async (p: any) => {
                    try {
                        let signData = p.firmaFC;
                        
                        // If we have direct firmaFC
                        if (signData) {
                            if (!signData.startsWith('data:image')) {
                                try {
                                    const proxyRes = await api.get<{ base64: string }>(`/pacientes/${p.id}/firma-base64`);
                                    signData = proxyRes.data.base64;
                                } catch (proxyErr) {
                                    console.error('Error fetching signature via proxy in list:', proxyErr);
                                    signData = null; // Mark as failed
                                }
                            }
                        }

                        if (signData) {
                            signaturesMap.set(p.id, signData);
                        }
                    } catch (e) {
                        console.error(`Error loading signature for patient ${p.id}:`, e);
                    }
                }));
                Swal.close();
            }

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Lista de Pacientes</title>
                    <style>
                        @page {
                            size: A4; /* Vertical */
                            margin: 2cm 1.5cm 3cm 1.5cm;
                        }
                        
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0;
                            color: #333;
                        }
                        
                        .header {
                            display: flex;
                            align-items: center;
                            margin-bottom: 20px;
                            padding-bottom: 15px;
                            border-bottom: 2px solid #3498db;
                        }
                        
                        h1 {
                            color: #2c3e50;
                            margin: 0;
                            font-size: 24px;
                        }
                        
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 10px;
                        }
                        
                        th {
                            background-color: #3498db;
                            color: white;
                            padding: 8px 6px;
                            text-align: left;
                            font-weight: bold;
                            border: 1px solid #2980b9;
                        }
                        
                        td {
                            padding: 6px;
                            border: 1px solid #ddd;
                        }
                        
                        tr:nth-child(even) {
                            background-color: #f8f9fa;
                        }
                        
                        .status-active {
                            color: #27ae60;
                            font-weight: bold;
                        }
                        
                        .status-inactive {
                            color: #e74c3c;
                            font-weight: bold;
                        }
                        
                        .footer {
                            position: fixed;
                            bottom: 1.5cm;
                            left: 1.5cm;
                            right: 1.5cm;
                            padding-top: 10px;
                            border-top: 1px solid #eee;
                            font-size: 10px;
                            color: #777;
                            display: flex;
                            justify-content: space-between;
                        }
                        
                        @media print {
                            th {
                                background-color: #3498db !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            
                            tr:nth-child(even) {
                                background-color: #f8f9fa !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            
                            .footer {
                                position: fixed;
                                bottom: 0;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Lista de Pacientes</h1>
                            <p style="color: #666; margin-top: 5px;">Gestión integral de pacientes y sus historias clínicas</p>
                        </div>
                    </div>
                    
                    <table>
                        <thead>
                            <tr>
                                 <th>#</th>
                                 <th>Paciente</th>
                                 <th>Celular</th>
                                 <th>Fecha Nac.</th>
                                 <th>Estado</th>
                                 <th>Firma FC</th>
                             </tr>
                         </thead>
                        <tbody>
                            ${allPacientes.map((p: Paciente, index: number) => `
                                <tr>
                                    <td>${index + 1}</td>
                                    <td>${p.nombre} ${p.paterno} ${p.materno || ''}</td>
                                    <td>${p.celular}</td>
                                    <td>${formatDate(p.fecha_nacimiento)}</td>
                                    <td class="${p.estado === 'activo' ? 'status-active' : 'status-inactive'}">
                                         ${p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                                    </td>
                                    <td>
                                         ${signaturesMap.has(p.id) ? `
                                             <img src="${signaturesMap.get(p.id)}" style="max-height: 40px; max-width: 80px; object-fit: contain;" />
                                         ` : '<span style="color: #ccc; font-size: 8px;">Sin firma</span>'}
                                    </td>
                                 </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer">
                        <div>Sistema de Gestión</div>
                        <div>Reporte Generado: ${new Date().toLocaleDateString()}</div>
                    </div>
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            const images = Array.from(doc.querySelectorAll('img'));
            let loadedCount = 0;
            let printTriggered = false;

            const doPrint = () => {
                if (printTriggered) return;
                printTriggered = true;
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print error:', e);
                } finally {
                    setTimeout(() => {
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }, 2000);
                }
            };

            if (images.length > 0) {
                images.forEach(img => {
                    if (img.complete) {
                        loadedCount++;
                        if (loadedCount === images.length) doPrint();
                    } else {
                        img.onload = () => {
                            loadedCount++;
                            if (loadedCount === images.length) doPrint();
                        };
                        img.onerror = () => {
                            loadedCount++;
                            if (loadedCount === images.length) doPrint();
                        };
                    }
                });
                // Fallback timeout for images
                setTimeout(doPrint, 5000);
            } else {
                doPrint();
            }
        } catch (error) {
            console.error('Error al imprimir:', error);
            alert('Error al generar el documento de impresión');
        }
    };

    const handlePrintPaciente = async (pacientePreview: Paciente) => {
        try {
            Swal.fire({
                title: 'Generando Ficha...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const res = await api.get<Paciente>(`/pacientes/${pacientePreview.id}`);
            const fullPaciente = res.data;
            const ficha = fullPaciente.fichaMedica;

            let finalSignatureData = '';
            
            // Try direct firmaFC from patient record
            if (fullPaciente.firmaFC) {
                finalSignatureData = fullPaciente.firmaFC;
                if (!finalSignatureData.startsWith('data:image')) {
                    try {
                        const proxyRes = await api.get<{ base64: string }>(`/pacientes/${fullPaciente.id}/firma-base64`);
                        finalSignatureData = proxyRes.data.base64;
                    } catch (e) {
                        console.error('Error loading signature via proxy:', e);
                        finalSignatureData = '';
                    }
                }
            } 

            const checkIcon = (val: boolean | undefined) => val ? '☒' : '☐';

            const calcEdad = (fecha?: string) => {
                if (!fecha) return '—';
                const hoy = new Date(); const nac = new Date(fecha);
                let edad = hoy.getFullYear() - nac.getFullYear();
                const m = hoy.getMonth() - nac.getMonth();
                if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
                return `${edad} años`;
            };

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow?.document;
            if (!doc) throw new Error('No se pudo crear el iframe');

            const printContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Ficha de Paciente - ${fullPaciente.nombre} ${fullPaciente.paterno}</title>
                    <style>
                        @page { size: A4; margin: 0; }
                        body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.4; font-size: 11px; }
                        .page-container { height: 297mm; width: 210mm; position: relative; padding: 1.5cm 1.5cm; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; }
                        .page-container:last-child { page-break-after: auto; }
                        .header { border-bottom: 2px solid #3498db; margin-bottom: 15px; padding-bottom: 10px; }
                        h1 { color: #2c3e50; margin: 0; font-size: 20px; text-transform: uppercase; }
                        h2 { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 3px; margin-top: 15px; margin-bottom: 10px; font-size: 13px; text-transform: uppercase; background: #f9f9f9; padding-left: 5px; }
                        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
                        .field { margin-bottom: 5px; }
                        .label { font-weight: bold; color: #666; display: block; font-size: 9px; text-transform: uppercase; }
                        .value { font-size: 11px; border-bottom: 1px dotted #ddd; padding-bottom: 1px; min-height: 14px; }
                        .checkbox-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; }
                        .checkbox-item { display: flex; align-items: center; gap: 4px; font-size: 10px; }
                        .footer { position: absolute; bottom: 1cm; left: 1.5cm; right: 1.5cm; font-size: 9px; color: #999; display: flex; justify-content: space-between; border-top: 1px solid #eee; padding-top: 5px; }
                    </style>
                </head>
                <body>
                    <div class="page-container">
                        <div class="header"><h1>Ficha de Paciente</h1></div>
                        <h2>Datos Personales</h2>
                        <div class="info-grid">
                            <div class="field"><span class="label">Paterno</span><div class="value">${fullPaciente.paterno}</div></div>
                            <div class="field"><span class="label">Materno</span><div class="value">${fullPaciente.materno}</div></div>
                            <div class="field"><span class="label">Nombres</span><div class="value">${fullPaciente.nombre}</div></div>
                            <div class="field"><span class="label">Nacimiento</span><div class="value">${formatDate(fullPaciente.fecha_nacimiento)} (${calcEdad(fullPaciente.fecha_nacimiento)})</div></div>
                            <div class="field"><span class="label">Sexo</span><div class="value">${fullPaciente.sexo}</div></div>
                            <div class="field"><span class="label">C.I.</span><div class="value">${(fullPaciente as any).ci || '-'}</div></div>
                            <div class="field"><span class="label">Celular</span><div class="value">${fullPaciente.celular}</div></div>
                            <div class="field"><span class="label">Seguro</span><div class="value">${fullPaciente.seguro_medico || '-'}</div></div>
                            <div class="field"><span class="label">Vencimiento</span><div class="value">${fullPaciente.fecha_vencimiento ? formatDate(fullPaciente.fecha_vencimiento) : '-'}</div></div>
                        </div>
                        <h2>Contacto y Otros</h2>
                        <div class="info-grid">
                            <div class="field" style="grid-column: span 2;"><span class="label">Dirección</span><div class="value">${fullPaciente.direccion}</div></div>
                            <div class="field"><span class="label">Teléfono</span><div class="value">${fullPaciente.telefono || '-'}</div></div>
                            <div class="field" style="grid-column: span 2;"><span class="label">Email</span><div class="value">${fullPaciente.email || '-'}</div></div>
                            <div class="field"><span class="label">Profesión</span><div class="value">${fullPaciente.profesion || '-'}</div></div>
                        </div>
                        <h2>Responsable</h2>
                        <div class="info-grid">
                            <div class="field" style="grid-column: span 2;"><span class="label">Nombre</span><div class="value">${fullPaciente.responsable || '-'}</div></div>
                            <div class="field"><span class="label">Parentesco</span><div class="value">${fullPaciente.parentesco || '-'}</div></div>
                        </div>
                        <h2>Consulta</h2>
                        <div class="field"><span class="label">Última Visita Odontólogo</span><div class="value">${ficha?.ultima_visita_odontologo || '-'}</div></div>
                        <div class="field"><span class="label">Motivo de Consulta</span><div class="value">${ficha?.motivo_consulta || fullPaciente.motivo || '-'}</div></div>
                        <div class="footer"><div>Sistema de Gestión</div><div>Página 1 de 2</div></div>
                    </div>
                    <div class="page-container">
                        <div class="header"><h1>Ficha Médica</h1></div>
                        ${ficha ? `
                            <h2>Antecedentes Patológicos</h2>
                            <div class="checkbox-grid">
                                <div class="checkbox-item"><span>${checkIcon(ficha.bruxismo)}</span> Bruxismo</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.alergia_medicamento)}</span> Alergias ${ficha.alergia_medicamento_detalle ? `(${ficha.alergia_medicamento_detalle})` : ''}</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.medicamento_72h)}</span> Med. 72h ${ficha.medicamento_72h_detalle ? `(${ficha.medicamento_72h_detalle})` : ''}</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.tratamiento_medico)}</span> Tratamiento ${ficha.tratamiento_medico_detalle ? `(${ficha.tratamiento_medico_detalle})` : ''}</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.articulaciones)}</span> Articulaciones</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.anestesiado_anteriormente)}</span> Anestesiado Ant.</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.reaccion_anestesia)}</span> Reacción Anest.</div>
                            </div>
                            <h2>Enfermedades</h2>
                            <div class="checkbox-grid">
                                <div class="checkbox-item"><span>${checkIcon(ficha.enf_neurologicas)}</span> Neurológicas</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.enf_pulmonares)}</span> Pulmonares</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.enf_cardiacas)}</span> Cardíacas</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.enf_higado)}</span> Hígado</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.enf_gastricas)}</span> Gástricas</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.enf_venereas)}</span> Venéreas</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.enf_renales)}</span> Renales</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.diabetes)}</span> Diabetes</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.anemia)}</span> Anemia</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.hipertension)}</span> Hipertensión</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.hipotension)}</span> Hipotensión</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.prueba_vih)}</span> Prueba VIH ${ficha.prueba_vih_resultado ? `(${ficha.prueba_vih_resultado})` : ''}</div>
                            </div>
                            <h2>Hábitos</h2>
                            <div class="checkbox-grid">
                                <div class="checkbox-item"><span>${checkIcon(ficha.usa_hilo_dental)}</span> Hilo Dental</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.usa_enjuague)}</span> Enjuague</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.fuma)}</span> Fuma ${ficha.fuma_cantidad ? `(${ficha.fuma_cantidad})` : ''}</div>
                                <div class="checkbox-item"><span>${checkIcon(ficha.consume_citricos)}</span> Cítricos</div>
                            </div>
                            <h2>Observaciones Generales</h2>
                            <div class="value" style="min-height: 40px;">${ficha.observaciones || 'Ninguna observación registrada'}</div>
                        ` : '<p>No hay ficha médica registrada.</p>'}
                        <div style="margin-top: auto; text-align: center; padding-bottom: 20px;">
                            ${finalSignatureData ? `
                                <img src="${finalSignatureData}" style="max-width: 250px; max-height: 100px; margin-bottom: 5px;" />
                                <div style="font-size: 8px; color: #999;">FIRMADO DIGITALMENTE</div>
                            ` : '<div style="height: 100px;"></div>'}
                            <div style="border-top: 1px solid #333; width: 300px; margin: 10px auto;"></div>
                            <div style="font-weight: bold; font-size: 14px;">FIRMA PACIENTE</div>
                            <div style="font-size: 10px; font-weight: bold; margin-top: 5px;">DOCUMENTO EN CALIDAD DE DECLARACIÓN JURADA</div>
                        </div>
                        <div class="footer"><div>Sistema de Gestión</div><div>Página 2 de 2</div></div>
                    </div>
                </body>
                </html>
            `;

            doc.open();
            doc.write(printContent);
            doc.close();

            const images = Array.from(doc.querySelectorAll('img'));
            let loadedCount = 0;
            let printTriggered = false;

            const doPrint = () => {
                if (printTriggered) return;
                printTriggered = true;

                if (Swal.isVisible()) Swal.close();
                
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (e) {
                    console.error('Print trigger error:', e);
                }

                // Give it time to open the dialog before removing
                setTimeout(() => { 
                    if (document.body.contains(iframe)) document.body.removeChild(iframe); 
                }, 2000);
            };

            if (images.length > 0) {
                images.forEach(img => {
                    if (img.complete) {
                        loadedCount++;
                        if (loadedCount === images.length) doPrint();
                    } else {
                        img.onload = () => {
                            loadedCount++;
                            if (loadedCount === images.length) doPrint();
                        };
                        img.onerror = (e) => {
                            console.error('Image load error in print:', img.src, e);
                            loadedCount++;
                            if (loadedCount === images.length) doPrint();
                        };
                    }
                });
                // Fallback timeout
                setTimeout(doPrint, 3500);
            } else {
                doPrint();
            }
        } catch (error) {
            console.error('Error al imprimir ficha de paciente:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo generar el documento de impresión.'
            });
        }
    };


    return (
        <div className="content-card">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 no-print gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                        <Users className="text-blue-600" size={32} />
                        Lista de Pacientes
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestión integral de pacientes y sus historias clínicas</p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center items-center">
                    <button
                        onClick={() => setShowManual(true)}
                        className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-1.5 rounded-full flex items-center justify-center w-[30px] h-[30px] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        title="Ayuda / Manual"
                    >
                        ?
                    </button>
                                           <div className="flex gap-2 items-center">
                        <button
                            onClick={exportToExcel}
                            className="bg-[#28a745] hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a Excel"
                        >
                            <FileText size={18} />
                            <span className="text-sm">Excel</span>
                        </button>
                        <button
                            onClick={exportToPDF}
                            className="bg-[#dc3545] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Exportar a PDF"
                        >
                            <Download size={18} />
                            <span className="text-sm">PDF</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center shadow-md transition-all transform hover:-translate-y-0.5 gap-2"
                            title="Imprimir"
                        >
                            <Printer size={18} />
                            <span className="text-sm">Imprimir</span>
                        </button>
                    </div>

                    <div className="h-10 w-px bg-gray-300 dark:bg-gray-600 mx-2 self-center"></div>

                    <button
                        onClick={() => navigate('/pacientes/create')}
                        className="bg-[#3498db] hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                        <span className="text-xl font-bold">+</span> Nuevo Paciente
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 no-print">
                <div className="flex gap-2 w-full md:max-w-md">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, paterno o materno..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-800 dark:text-white bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-300"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                    </div>
                    {searchTerm && (
                        <button
                            onClick={handleClearSearch}
                            className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                Mostrando {totalRecords === 0 ? 0 : (currentPage - 1) * limit + 1} - {Math.min(currentPage * limit, totalRecords)} de {totalRecords} registros
            </div>

            <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Paciente</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Celular</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Seguro</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fecha Nacimiento</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Firma FC</th>

                            <th className="no-print px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {Array.isArray(pacientes) && pacientes.map((paciente, index) => (
                            <tr key={paciente.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-3 text-gray-800 dark:text-gray-300">{(currentPage - 1) * limit + index + 1}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    <div className="flex flex-col">
                                        <span
                                            onClick={() => navigate(`/pacientes/${paciente.id}`)}
                                            className="font-bold cursor-pointer hover:underline hover:opacity-75 transition-opacity"
                                            title="Ver el Perfil del Paciente"
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={e => e.key === 'Enter' && navigate(`/pacientes/${paciente.id}`)}
                                        >
                                            {`${paciente.nombre} ${paciente.paterno} ${paciente.materno || ''}`.trim()}
                                        </span>
                                        <div className="flex gap-2 mt-1">
                                            {paciente.clasificacion && (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border ${paciente.clasificacion.charAt(0) === 'A' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' :
                                                        paciente.clasificacion.charAt(0) === 'B' ? 'bg-slate-400/20 text-slate-700 dark:text-slate-300 border-slate-400/30' :
                                                            'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30'
                                                    }`}>
                                                    CLASE {paciente.clasificacion}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatDate(paciente.fecha)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">{formatCelular(paciente.celular)}</td>
                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    {paciente.seguro_medico ? (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            paciente.seguro_medico === 'PRIVADO' 
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                        }`}>
                                            {paciente.seguro_medico}
                                        </span>
                                    ) : '-'}
                                </td>

                                <td className="p-3 text-gray-800 dark:text-gray-300">
                                    {formatDate(paciente.fecha_nacimiento)}
                                    {paciente.fecha_nacimiento && (
                                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({calcularEdad(paciente.fecha_nacimiento)})</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-sm ${paciente.estado === 'activo'
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                        }`}>
                                        {paciente.estado}
                                    </span>
                                </td>
                                <td className="p-3">
                                    {paciente.tieneFirmaFC ? (
                                        <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold text-sm">
                                            <CheckCircle size={16} />
                                            <span>Firmado</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setSelectedPacienteIdForSignature(paciente.id);
                                                setShowSignatureModal(true);
                                            }}
                                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors border border-blue-200"
                                        >
                                            Firmar
                                        </button>
                                    )}
                                </td>


                                <td className="no-print p-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setSelectedPacienteIdForView(paciente.id);
                                            setShowViewModal(true);
                                        }}
                                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                        title="Ver Ficha"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handlePrintPaciente(paciente)}
                                        className="p-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                        title="Imprimir Ficha"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="6 9 6 2 18 2 18 9"></polyline>
                                            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                                            <rect x="6" y="14" width="12" height="8"></rect>
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => navigate(`/pacientes/edit/${paciente.id}`)}
                                        className="p-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                        title="Editar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    {paciente.estado === 'activo' ? (
                                        <button
                                            onClick={() => handleDelete(paciente.id)}
                                            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Dar de baja"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleReactivate(paciente.id)}
                                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                                            title="Reactivar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {(!pacientes || pacientes.length === 0) && (
                            <tr>
                                <td colSpan={9} className="p-5 text-center text-gray-500 dark:text-gray-400">No hay pacientes registrados</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
            />
            {/* Manual Modal */}
            <ManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                title="Manual de Usuario - Pacientes"
                sections={manualSections}
            />

            <PacienteViewModal
                isOpen={showViewModal}
                onClose={() => { setShowViewModal(false); setSelectedPacienteIdForView(null); }}
                pacienteId={selectedPacienteIdForView}
            />
            {showSignatureModal && (
                <SignatureModal
                    isOpen={showSignatureModal}
                    onClose={() => {
                        setShowSignatureModal(false);
                        setSelectedPacienteIdForSignature(null);
                        fetchPacientes(); // Refresh to show "Firmado"
                    }}
                    tipoDocumento="paciente"
                    documentoId={selectedPacienteIdForSignature || 0}
                    rolFirmante="paciente"
                    closeOnSuccess={true}
                />
            )}
        </div>
    );
};

export default PacienteList;
