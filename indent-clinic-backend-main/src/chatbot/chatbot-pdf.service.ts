import { Injectable } from '@nestjs/common';
import axios from 'axios';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

@Injectable()
export class ChatbotPdfService {
    private printer: any;

    constructor() {
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

    async getImageBase64(url: string): Promise<string | null> {
        if (!url) return null;
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return `data:image/png;base64,${Buffer.from(response.data, 'binary').toString('base64')}`;
        } catch (error) {
            console.warn(`[ChatbotPdfService] Failed to load logo from ${url}`, error.message);
            return null;
        }
    }

    async generateProformasPdf(paciente: any, proformas: any[], clinica: any): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const content: any[] = [];
                const logoBase64 = await this.getImageBase64(clinica?.logo);

                proformas.forEach((p, index) => {
                    if (index > 0) {
                        content.push({ text: '', pageBreak: 'before' });
                    }

                    // Header: Logo (left) and Date (right)
                    const headerColumns: any[] = [];
                    if (logoBase64) {
                        headerColumns.push({ image: logoBase64, width: 70 });
                    } else {
                        headerColumns.push({ text: clinica?.nombre || '', bold: true, fontSize: 14 });
                    }

                    headerColumns.push({
                        text: this.formatDateSpanish(p.fecha),
                        alignment: 'right',
                        fontSize: 10,
                        margin: [0, 15, 0, 0]
                    });

                    content.push({ columns: headerColumns, margin: [0, 0, 0, 30] });

                    // Salutation and Intro
                    const patientName = `${paciente.paterno || ''} ${paciente.materno || ''} ${paciente.nombre || ''}`.trim().toUpperCase();
                    const insurance = paciente.seguro_medico ? ` (${paciente.seguro_medico})` : '';

                    content.push({ text: 'Señor(a):', fontSize: 11, margin: [0, 0, 0, 2] });
                    content.push({ text: `${patientName}${insurance}`, fontSize: 11, bold: true, margin: [0, 0, 0, 15] });

                    content.push({ text: 'De mi consideración:', fontSize: 11, margin: [0, 0, 0, 5] });
                    content.push({
                        text: 'Según los estudios realizados le presentamos el siguiente plan de tratamiento odontológico que Ud. requiere:',
                        fontSize: 11,
                        margin: [0, 0, 0, 15]
                    });

                    // Proforma Number (Plan label similar to capture)
                    content.push({
                        text: `Plan # ${(p.numero || 0).toString().padStart(2, '0')}`,
                        alignment: 'right',
                        bold: true,
                        fontSize: 11,
                        margin: [0, 0, 0, 5]
                    });

                    // Table
                    const tableHeader = [
                        { text: 'Pieza(s)', style: 'tableHeaderBudget', alignment: 'center' },
                        { text: 'Descripción', style: 'tableHeaderBudget', alignment: 'center' },
                        { text: 'Cant.', style: 'tableHeaderBudget', alignment: 'center' },
                        { text: 'P.U.', style: 'tableHeaderBudget', alignment: 'center' },
                        { text: 'Total', style: 'tableHeaderBudget', alignment: 'center' }
                    ];

                    const widths: any[] = ['auto', '*', 'auto', 'auto', 'auto'];
                    const body: any[] = [tableHeader];

                    if (p.detalles) {
                        p.detalles.forEach((d: any) => {
                            body.push([
                                { text: d.piezas || '', alignment: 'center' },
                                { text: d.arancel?.detalle || d.tratamiento || '', alignment: 'left' },
                                { text: (d.cantidad || 0).toString(), alignment: 'center' },
                                { text: Number(d.precioUnitario || 0).toFixed(2), alignment: 'right' },
                                { text: Number(d.subTotal || 0).toFixed(2), alignment: 'right' }
                            ]);
                        });
                    }

                    content.push({
                        table: {
                            headerRows: 1,
                            widths: widths,
                            body: body
                        },
                        layout: {
                            hLineWidth: (i: number) => 0.5,
                            vLineWidth: (i: number) => 0.5,
                            hLineColor: (i: number) => '#000',
                            vLineColor: (i: number) => '#000',
                            paddingLeft: (i: number) => 5,
                            paddingRight: (i: number) => 5,
                            paddingTop: (i: number) => 3,
                            paddingBottom: (i: number) => 3,
                        },
                        fontSize: 9,
                        margin: [0, 0, 0, 0]
                    });

                    // Total Bs. Box
                    content.push({
                        table: {
                            widths: ['*', 100, 80],
                            body: [
                                [
                                    { text: '', border: [false, false, false, false] },
                                    { text: 'TOTAL Bs.', bold: true, alignment: 'center', border: [true, true, true, true], fillColor: '#fff' },
                                    { text: Number(p.total || 0).toFixed(2), bold: true, alignment: 'right', border: [true, true, true, true], fillColor: '#fff' }
                                ]
                            ]
                        },
                        margin: [0, 0, 0, 15]
                    });

                    // Amount in Words
                    const totalVal = Number(p.total || 0);
                    const decimalPart = (totalVal % 1).toFixed(2).substring(2);
                    const words = this.numberToWords(totalVal);
                    content.push({
                        text: `SON: ${words} ${decimalPart}/100 BOLIVIANOS`,
                        fontSize: 10,
                        margin: [0, 0, 0, 30]
                    });

                    // Payment System Section
                    content.push({ text: 'SISTEMA DE PAGO', bold: true, fontSize: 10, margin: [0, 0, 0, 5] });
                    content.push({
                        text: '- Cancelación del 50% al inicio. 30% durante el tratamiento. 20% antes de finalizado el mismo.',
                        fontSize: 10,
                        margin: [0, 0, 0, 15]
                    });

                    // Note and Guarantee
                    content.push({
                        text: [
                            { text: 'NOTA: ', bold: true },
                            'Se garantiza los trabajos realizados si el paciente sigue las recomendaciones indicadas y asiste a sus controles periódicos de manera puntual.'
                        ],
                        fontSize: 10,
                        margin: [0, 0, 0, 5]
                    });

                    content.push({
                        text: 'El presente plan de tratamiento podría tener modificaciones en el transcurso del tratamiento; el mismo será notificado oportunamente a su persona.',
                        fontSize: 9,
                        margin: [0, 0, 0, 5]
                    });
                    content.push({ text: 'Plan de tratamiento válido por 15 días.', fontSize: 9, margin: [0, 0, 0, 5] });
                    content.push({ text: 'En conformidad y aceptando el presente plan de tratamiento, firmo.', fontSize: 9, margin: [0, 0, 0, 40] });

                    // Signatures
                    content.push({
                        columns: [
                            {
                                width: '*',
                                stack: [
                                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
                                    { text: (clinica?.nombre || 'InDent Clinic').toUpperCase(), alignment: 'center', margin: [0, 5, 0, 0], fontSize: 10, bold: true },
                                    { text: 'FIRMA AUTORIZADA', alignment: 'center', fontSize: 9 }
                                ],
                                alignment: 'center'
                            },
                            {
                                width: '*',
                                stack: [
                                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1 }] },
                                    { text: `${patientName}${insurance}`, alignment: 'center', margin: [0, 5, 0, 0], fontSize: 10, bold: true },
                                    { text: 'PACIENTE', alignment: 'center', fontSize: 9 }
                                ],
                                alignment: 'center'
                            }
                        ],
                        margin: [0, 30, 0, 0]
                    });
                });

                const docDefinition = {
                    defaultStyle: { font: 'Helvetica', fontSize: 11 },
                    content: content,
                    styles: {
                        tableHeaderBudget: { bold: true, fontSize: 10, color: 'black' }
                    },
                    pageSize: 'LETTER',
                    pageMargins: [50, 50, 50, 50]
                };

                const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
                const chunks: any[] = [];
                pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (err: any) => reject(err));
                pdfDoc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    private formatDateSpanish(dateString: string): string {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);

        const months = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];

        const days = [
            'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
        ];

        const localDate = new Date(year, month - 1, day);
        const dayOfWeek = days[localDate.getDay()];

        return `La Paz ${dayOfWeek}, ${day} de ${months[month - 1]} de ${year}`;
    }

    async generatePaymentSummaryPdf(
        paciente: any,
        pagos: any[],
        financialSummary: { totalPagado: number, costoTotal: number, saldo: number },
        clinica: any
    ): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            try {
                const content: any[] = [];
                const logoBase64 = await this.getImageBase64(clinica?.logo);

                // 1. Header with Logo (left) and Title (right)
                const headerRow: any[] = [];
                if (logoBase64) {
                    headerRow.push({ image: logoBase64, width: 60 });
                } else {
                    headerRow.push({ text: clinica?.nombre || '', bold: true, fontSize: 12 });
                }

                headerRow.push({
                    stack: [
                        { text: 'RESUMEN DE PAGOS', fontSize: 18, bold: true, color: '#7e22ce', alignment: 'right' },
                        { text: `Fecha de Emisión: ${new Date().toLocaleDateString('es-BO')}`, fontSize: 9, alignment: 'right', margin: [0, 5, 0, 0] }
                    ],
                    width: '*'
                });

                content.push({ columns: headerRow, margin: [0, 0, 0, 5] });

                // Purple Line
                content.push({
                    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#7e22ce' }],
                    margin: [0, 0, 0, 20]
                });

                // 2. Patient info box (Rounded grey box)
                const patientName = `${paciente.paterno || ''} ${paciente.materno || ''} ${paciente.nombre || ''}`.trim().toUpperCase();
                const medicalInsurance = paciente.seguro_medico ? ` (${paciente.seguro_medico})` : '';

                content.push({
                    stack: [
                        {
                            canvas: [{ type: 'rect', x: 0, y: 0, w: 515, h: 50, r: 10, lineColor: '#e5e7eb', fillColor: '#f9fafb' }]
                        },
                        {
                            relativePosition: { x: 20, y: -40 },
                            stack: [
                                { text: 'DATOS DEL PACIENTE', fontSize: 12, bold: true, color: '#1f2937' },
                                { text: [ { text: 'Nombre: ', bold: true }, { text: `${patientName}${medicalInsurance}` } ], fontSize: 10, margin: [0, 5, 0, 0] }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                });

                // 3. Payments Table (Purple header)
                const tableBody: any[][] = [
                    [
                        { text: 'Fecha', style: 'tableHeader' },
                        { text: 'Concepto / Tratamiento', style: 'tableHeader' },
                        { text: 'Forma Pago', style: 'tableHeader' },
                        { text: 'Recibo', style: 'tableHeader' },
                        { text: 'Monto (Bs.)', style: 'tableHeader', alignment: 'right' }
                    ]
                ];

                pagos.forEach(p => {
                    tableBody.push([
                        { text: p.fecha ? p.fecha.toString().split('T')[0].split('-').reverse().join('/') : '-', alignment: 'left' },
                        { text: p.tratamientoNombre || (p.proforma?.numero ? `Plan #${p.proforma.numero}` : 'Abono General'), alignment: 'left' },
                        { text: p.formaPagoRel?.forma_pago || p.formaPago || '-', alignment: 'left' },
                        { text: p.recibo || '-', alignment: 'left' },
                        { text: Number(p.monto || 0).toFixed(2), alignment: 'right' }
                    ]);
                });

                content.push({
                    table: {
                        headerRows: 1,
                        widths: ['auto', '*', 'auto', 'auto', 'auto'],
                        body: tableBody
                    },
                    layout: {
                        hLineWidth: (i: number) => 0.5,
                        vLineWidth: (i: number) => 0.5,
                        hLineColor: (i: number, node: any) => i === 1 ? '#7e22ce' : '#e5e7eb',
                        vLineColor: (i: number) => '#e5e7eb',
                        paddingLeft: (i: number) => 8,
                        paddingRight: (i: number) => 8,
                        paddingTop: (i: number) => 5,
                        paddingBottom: (i: number) => 5,
                    },
                    fontSize: 9,
                    margin: [0, 0, 0, 25]
                });

                // 4. Totales section
                content.push({
                    columns: [
                        { width: '*', text: '' },
                        {
                            width: 250,
                            stack: [
                                {
                                    columns: [
                                        { text: 'Total Abonado:', fontSize: 10, color: '#4b5563' },
                                        { text: `Bs. ${financialSummary.totalPagado.toFixed(2)}`, alignment: 'right', fontSize: 10, bold: true }
                                    ],
                                    margin: [0, 0, 0, 5]
                                },
                                {
                                    columns: [
                                        { text: 'Costo Total Tratamientos:', fontSize: 10, color: '#4b5563' },
                                        { text: `Bs. ${financialSummary.costoTotal.toFixed(2)}`, alignment: 'right', fontSize: 10, bold: true }
                                    ],
                                    margin: [0, 0, 0, 10]
                                },
                                {
                                    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 250, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' }]
                                },
                                {
                                    columns: [
                                        { text: 'SALDO PENDIENTE:', fontSize: 12, bold: true, color: '#dc2626' },
                                        { text: `Bs. ${financialSummary.saldo.toFixed(2)}`, alignment: 'right', fontSize: 12, bold: true, color: '#dc2626' }
                                    ],
                                    margin: [0, 10, 0, 0]
                                }
                            ]
                        }
                    ]
                });

                // 5. Footer
                content.push({
                    text: `${clinica?.nombre || 'InDent Clinic'} - Reporte generado automáticamente`,
                    fontSize: 8,
                    color: '#9ca3af',
                    alignment: 'center',
                    margin: [0, 40, 0, 0]
                });

                const docDefinition = {
                    defaultStyle: { font: 'Helvetica' },
                    content: content,
                    styles: {
                        tableHeader: { bold: true, fontSize: 10, color: '#7e22ce', margin: [0, 2, 0, 2] }
                    },
                    pageSize: 'LETTER',
                    pageMargins: [40, 40, 40, 40]
                };

                const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
                const chunks: any[] = [];
                pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (err: any) => reject(err));
                pdfDoc.end();
            } catch (error) {
                reject(error);
            }
        });
    }

    private numberToWords(amount: number): string {
        const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        const convertGroup = (n: number): string => {
            let output = '';
            if (n === 100) return 'CIEN';
            if (n >= 100) {
                output += hundreds[Math.floor(n / 100)] + ' ';
                n %= 100;
            }
            if (n >= 20) {
                output += tens[Math.floor(n / 10)];
                if (n % 10 > 0) output += ' Y ' + units[n % 10];
            } else if (n >= 10) {
                output += teens[n - 10];
            } else if (n > 0) {
                output += units[n];
            }
            return output.trim();
        };

        const integerPart = Math.floor(amount);
        if (integerPart === 0) return 'CERO';

        let words = '';
        if (integerPart >= 1000000) {
            const millions = Math.floor(integerPart / 1000000);
            words += (millions === 1 ? 'UN MILLON' : convertGroup(millions) + ' MILLONES') + ' ';
            const remainder = integerPart % 1000000;
            if (remainder > 0) {
                if (remainder >= 1000) {
                    const thousands = Math.floor(remainder / 1000);
                    words += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
                    words += convertGroup(remainder % 1000);
                } else {
                    words += convertGroup(remainder);
                }
            }
        } else if (integerPart >= 1000) {
            const thousands = Math.floor(integerPart / 1000);
            words += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
            words += convertGroup(integerPart % 1000);
        } else {
            words += convertGroup(integerPart);
        }
        return words.trim();
    }
}
