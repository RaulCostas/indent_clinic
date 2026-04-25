import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HistoriaClinica } from './entities/historia_clinica.entity';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

@Injectable()
export class HistoriaClinicaPdfService {
    private printer: any;

    constructor(
        @InjectRepository(HistoriaClinica)
        private historiaClinicaRepository: Repository<HistoriaClinica>,
    ) {
        const fonts = {
            Helvetica: {
                normal: 'Helvetica',
                bold: 'Helvetica-Bold',
                italics: 'Helvetica-Oblique',
                bolditalics: 'Helvetica-BoldOblique'
            }
        };
        this.printer = new PdfPrinter(fonts);
    }

    async generateHistoriaClinicaPdf(pacienteId: number, proformaId: number): Promise<Buffer> {
        // Fetch all historia clinica records for this patient and proforma
        const historiaRecords = await this.historiaClinicaRepository.find({
            where: {
                pacienteId,
                ...(proformaId > 0 ? { proformaId } : {})
            },
            relations: ['paciente', 'doctor', 'proforma'],
            order: { fecha: 'DESC' }
        });

        if (historiaRecords.length === 0) {
            throw new Error('No se encontraron registros de historia clínica');
        }

        const paciente = historiaRecords[0].paciente;
        const proforma = proformaId > 0 ? historiaRecords[0].proforma : null;

        // Format phone number
        const formatPhoneNumber = (phone: string | undefined): string => {
            if (!phone) return 'N/A';
            const cleaned = phone.replace(/\D/g, '');
            if (cleaned.length >= 10) {
                const countryCode = cleaned.substring(0, cleaned.length - 8);
                const number = cleaned.substring(cleaned.length - 8);
                return `(+${countryCode}) ${number}`;
            }
            return phone;
        };

        // Format date
        const formatDate = (dateString: string | Date): string => {
            const date = dateString instanceof Date ? dateString : new Date(dateString);
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        // Build table rows
        const tableBody = [
            [
                { text: 'Fecha', style: 'tableHeader' },
                { text: 'Pieza', style: 'tableHeader' },
                { text: 'Tratamiento', style: 'tableHeader' },
                { text: 'Observaciones', style: 'tableHeader' },
                { text: 'Cant.', style: 'tableHeader' },
                { text: 'Doctor', style: 'tableHeader' },
                { text: 'Asistente', style: 'tableHeader' },
                { text: 'Estado', style: 'tableHeader' }
            ],
            ...historiaRecords.map(record => [
                formatDate(record.fecha),
                record.pieza || '-',
                record.tratamiento || '-',
                record.observaciones || '-',
                record.cantidad?.toString() || '0',
                record.doctor ? `${record.doctor.paterno} ${record.doctor.nombre}` : '-',
                '-',
                record.estadoTratamiento || '-'
            ])
        ];

        const docDefinition = {
            pageSize: 'A4',
            pageMargins: [40, 60, 40, 80],
            defaultStyle: {
                font: 'Helvetica'
            },
            content: [
                // Header
                {
                    text: 'HISTORIAL DE TRATAMIENTOS',
                    style: 'header',
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                },
                {
                    canvas: [
                        {
                            type: 'line',
                            x1: 0, y1: 5,
                            x2: 515, y2: 5,
                            lineWidth: 2,
                            lineColor: '#3498db'
                        }
                    ],
                    margin: [0, 10, 0, 15]
                },
                // Patient info box with blue border (matching Próxima Cita format)
                {
                    canvas: [
                        {
                            type: 'rect',
                            x: 0,
                            y: 0,
                            w: 515,
                            h: proforma ? 35 : 20,
                            color: '#f8f9fa'
                        },
                        {
                            type: 'rect',
                            x: 0,
                            y: 0,
                            w: 4,
                            h: proforma ? 35 : 20,
                            color: '#3498db'
                        }
                    ],
                    margin: [0, 0, 0, 0]
                },
                {
                    stack: [
                        {
                            text: [
                                { text: 'PACIENTE: ', bold: true },
                                { text: `${paciente.paterno} ${paciente.materno} ${paciente.nombre}`.toUpperCase() }
                            ],
                            margin: [10, -28, 0, 3]
                        },
                        ...(proforma ? [{
                            text: [
                                { text: 'PLAN DE TRATAMIENTO: ', bold: true },
                                { text: `Plan #${proforma.numero || proforma.id} - ${formatDate(proforma.fecha)}` }
                            ],
                            margin: [10, 0, 0, 0]
                        }] : [])
                    ],
                    margin: [0, 0, 0, 10]
                },
                // Table
                {
                    table: {
                        headerRows: 1,
                        widths: [50, 40, 80, '*', 30, 60, 50, 50],
                        body: tableBody
                    },
                    layout: {
                        fillColor: (rowIndex: number) => {
                            return rowIndex === 0 ? '#3498db' : (rowIndex % 2 === 0 ? '#f8f9fa' : null);
                        },
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#ddd',
                        vLineColor: () => '#ddd'
                    }
                }
            ],
            footer: (currentPage: number, pageCount: number) => {
                return {
                    stack: [
                        {
                            canvas: [
                                {
                                    type: 'line',
                                    x1: 40, y1: 0,
                                    x2: 555, y2: 0,
                                    lineWidth: 1,
                                    lineColor: '#999'
                                }
                            ],
                            margin: [0, 0, 0, 5]
                        },
                        {
                            text: `Fecha de impresión: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}`,
                            alignment: 'right',
                            fontSize: 9,
                            color: '#333',
                            margin: [0, 0, 40, 20]
                        }
                    ]
                };
            },
            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    color: '#2c3e50'
                },
                tableHeader: {
                    bold: true,
                    fontSize: 9,
                    color: 'white',
                    fillColor: '#3498db'
                }
            }
        };

        return new Promise((resolve, reject) => {
            const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
            const chunks: Buffer[] = [];

            pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', reject);

            pdfDoc.end();
        });
    }
}
