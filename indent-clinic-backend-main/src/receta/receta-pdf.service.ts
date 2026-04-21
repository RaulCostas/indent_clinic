import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { FirmasService } from '../firmas/firmas.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PdfPrinter = require('pdfmake');

@Injectable()
export class RecetaPdfService {
    private printer: any;

    constructor(
        @Inject(forwardRef(() => FirmasService))
        private readonly firmasService: FirmasService
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


    async generateRecetaPdf(receta: any): Promise<Buffer> {
        // Fetch signatures
        const signatures = await this.firmasService.findByDocumento('receta', receta.id);
        const doctorSignature = signatures.find(s => s.rolFirmante === 'doctor' || s.rolFirmante === 'personal' || s.rolFirmante === 'administrador');

        return new Promise((resolve, reject) => {
            const content: any[] = [];

            // Header with Title
            content.push({
                text: 'RECETA MÉDICA',
                fontSize: 24,
                bold: true,
                color: '#2c3e50',
                alignment: 'center',
                margin: [0, 0, 0, 20]
            });

            // Blue separator line (Header bottom border)
            content.push({
                canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#3498db' }
                ],
                margin: [0, 0, 0, 20]
            });


            // Patient Info Box
            // Style: bg #f8f9fa, border-left 4px solid #3498db, padding 15px
            const patientName = receta.paciente
                ? `${receta.paciente.nombre} ${receta.paciente.paterno} ${receta.paciente.materno || ''}`.trim()
                : 'N/A';
            const doctorName = receta.user ? receta.user.name : 'N/A';
            const dateStr = this.formatDate(receta.fecha);

            content.push({
                table: {
                    widths: ['*'],
                    body: [
                        [{
                            stack: [
                                {
                                    text: [
                                        { text: 'PACIENTE: ', bold: true, color: '#2c3e50', fontSize: 10 },
                                        { text: patientName, color: '#333333', fontSize: 10 }
                                    ],
                                    margin: [0, 0, 0, 5]
                                },
                                {
                                    text: [
                                        { text: 'FECHA: ', bold: true, color: '#2c3e50', fontSize: 10 },
                                        { text: dateStr, color: '#333333', fontSize: 10 }
                                    ]
                                }
                            ],
                            fillColor: '#f8f9fa',
                            margin: [10, 10, 10, 10]
                        }]
                    ]
                },
                layout: {
                    hLineWidth: () => 0,
                    vLineWidth: (i: number) => (i === 0) ? 4 : 0, // Left border only? Table borders are handled differently.
                    // To do left border only in pdfmake table is tricky. 
                    // Use a layout that draws left border.
                    vLineColor: () => '#3498db',
                    paddingLeft: () => 10,
                },
                margin: [0, 0, 0, 20]
            });


            // Medications Table
            if (receta.detalles && receta.detalles.length > 0) {
                const tableBody: any[] = [
                    [
                        { text: 'Medicamento', style: 'tableHeader', alignment: 'left' },
                        { text: 'Cantidad', style: 'tableHeader', alignment: 'center' },
                        { text: 'Indicaciones', style: 'tableHeader', alignment: 'left' }
                    ]
                ];

                receta.detalles.forEach((detalle: any, index: number) => {
                    const rowColor = index % 2 === 0 ? '#f8f9fa' : null;
                    tableBody.push([
                        { text: detalle.medicamento || '', alignment: 'left', fillColor: rowColor, fontSize: 10 },
                        { text: detalle.cantidad || '', alignment: 'center', fillColor: rowColor, fontSize: 10 },
                        { text: detalle.indicacion || '', alignment: 'left', fillColor: rowColor, fontSize: 10 }
                    ]);
                });

                content.push({
                    table: {
                        headerRows: 1,
                        widths: ['35%', 'auto', '*'], // 35% Medicamento, Auto Cantidad, Rest Indicaciones
                        body: tableBody
                    },
                    layout: {
                        hLineWidth: (i: number, node: any) => (i === 0 || i === 1) ? 0 : 1, // Header line? 
                        vLineWidth: () => 1,
                        hLineColor: () => '#dddddd',
                        vLineColor: () => '#dddddd',
                        paddingLeft: () => 8,
                        paddingRight: () => 8,
                        paddingTop: () => 8,
                        paddingBottom: () => 8
                    },
                    margin: [0, 0, 0, 20]
                });
            } else {
                // Legacy Text Support
                content.push({
                    text: 'MEDICAMENTOS:',
                    bold: true,
                    fontSize: 10,
                    margin: [0, 0, 0, 5]
                });
                content.push({
                    text: receta.medicamentos || 'No especificado',
                    fontSize: 10,
                    margin: [0, 0, 0, 20]
                });
            }

            // General Indications / Observations
            if (receta.indicaciones) {
                content.push({
                    text: 'INDICACIONES GENERALES / OBSERVACIONES',
                    fontSize: 10,
                    bold: true,
                    color: '#2c3e50',
                    margin: [0, 0, 0, 5],
                    decoration: 'underline', // Optional styling
                    decorationColor: '#eeeeee' // Actually borderline
                });
                // Add bottom border line for title manually if needed, or just text
                content.push({
                    canvas: [
                        { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 1, lineColor: '#eeeeee' }
                    ],
                    margin: [0, 0, 0, 5]
                });

                content.push({
                    text: receta.indicaciones,
                    fontSize: 10,
                    color: '#555555',
                    margin: [0, 0, 0, 20]
                });
            }

            const docDefinition = {
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize: 10
                },
                content: content,
                footer: (currentPage: number, pageCount: number) => {
                    const footerStack: any[] = [];

                    // Signature only on the last page
                    if (currentPage === pageCount) {
                        if (doctorSignature) {
                            footerStack.push({
                                stack: [
                                    {
                                        image: doctorSignature.firmaData,
                                        width: 100,
                                        alignment: 'center',
                                        margin: [0, 0, 0, 5]
                                    },
                                    {
                                        text: `DIGITALMENTE FIRMADO POR: ${doctorSignature.usuario.name}`,
                                        fontSize: 7,
                                        alignment: 'center',
                                        color: '#7f8c8d'
                                    },
                                    {
                                        text: `HASH: ${doctorSignature.hashDocumento}`,
                                        fontSize: 6,
                                        alignment: 'center',
                                        color: '#bdc3c7'
                                    },
                                    {
                                        text: `FECHA: ${new Date(doctorSignature.timestamp).toLocaleString()}`,
                                        fontSize: 6,
                                        alignment: 'center',
                                        color: '#bdc3c7',
                                        margin: [0, 0, 0, 10]
                                    },
                                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: '#000' }] },
                                    { text: 'Firma y Sello Digital', alignment: 'center', fontSize: 10, margin: [0, 5, 0, 0] },
                                    { text: doctorSignature.usuario.name, alignment: 'center', fontSize: 8, color: '#7f8c8d' }
                                ],
                                alignment: 'center',
                                margin: [0, 0, 0, 15]
                            });
                        } else {
                            footerStack.push({
                                stack: [
                                    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 1, lineColor: '#000' }] },
                                    { text: 'Firma y Sello', alignment: 'center', fontSize: 10, margin: [0, 5, 0, 0] }
                                ],
                                alignment: 'center',
                                margin: [0, 0, 0, 20]
                            });
                        }
                    }

                    // Standard Footer (Line + Disclaimer + Date)
                    footerStack.push({
                        canvas: [
                            { type: 'line', x1: 56, y1: 0, x2: 538, y2: 0, lineWidth: 0.5, lineColor: '#333333' }
                        ],
                        margin: [0, 0, 0, 10]
                    });

                    footerStack.push({
                        columns: [
                            {
                                text: 'El presente documento es una receta médica válida emitida por CLINICA DENTAL.',
                                fontSize: 8,
                                color: '#333333',
                                alignment: 'left',
                                width: '*'
                            },
                            {
                                text: `Fecha de impresión: ${new Date().toLocaleString('es-ES')}`,
                                fontSize: 8,
                                color: '#333333',
                                alignment: 'right',
                                width: 'auto'
                            }
                        ],
                        margin: [56, 0, 42, 0] // Align with page margins (Left 56, Right 42)
                    });

                    return {
                        stack: footerStack
                    };
                },
                styles: {
                    tableHeader: {
                        bold: true,
                        fontSize: 10,
                        color: 'white',
                        fillColor: '#3498db'
                    }
                },
                pageSize: 'A4',
                pageMargins: [56, 56, 42, 110] // Increased bottom margin to accommodate signature + footer
            };

            const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
            const chunks: any[] = [];
            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err: any) => reject(err));
            pdfDoc.end();
        });
    }

    async generatePagoDoctorPdf(pago: any): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const content: any[] = [];
            const isDollar = ['Dólares', '$us', 'Sus', 'USD'].includes(pago.moneda);
            const currencySymbol = isDollar ? '$us' : 'Bs';

            // Header (Title + Quote No)
            content.push({
                stack: [
                    { text: 'RECIBO DE PAGO A DOCTOR', fontSize: 18, bold: true, color: '#2c3e50', margin: [0, 0, 0, 5] },
                    { text: `Nº Recibo: ${String(pago.id).padStart(6, '0')}`, fontSize: 10, color: '#7f8c8d' }
                ],
                alignment: 'center',
                margin: [0, 0, 0, 20]
            });

            // Blue separator line
            content.push({
                canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#3498db' }
                ],
                margin: [0, 0, 0, 20]
            });

            // Info Box
            // Mimicking the HTML: bg #f8f9fa, border-left 4px #3498db.
            // Using a table created to look like a box.
            const doctorName = pago.doctor
                ? `${pago.doctor.nombre} ${pago.doctor.paterno} ${pago.doctor.materno || ''}`.trim()
                : 'N/A';

            content.push({
                table: {
                    widths: ['50%', '50%'],
                    body: [
                        [
                            {
                                stack: [
                                    { text: 'DOCTOR:', fontSize: 9, bold: true, color: '#2c3e50' },
                                    { text: doctorName, fontSize: 10, color: '#333333', margin: [0, 2, 0, 10] },
                                    { text: 'FORMA DE PAGO:', fontSize: 9, bold: true, color: '#2c3e50' },
                                    { text: pago.formaPago?.forma_pago || 'No especificado', fontSize: 10, color: '#333333', margin: [0, 2, 0, 0] }
                                ],
                                border: [false, false, false, false]
                            },
                            {
                                stack: [
                                    { text: 'FECHA DE PAGO:', fontSize: 9, bold: true, color: '#2c3e50' },
                                    { text: this.formatDate(pago.fecha), fontSize: 10, color: '#333333', margin: [0, 2, 0, 10] },
                                    { text: 'MONEDA:', fontSize: 9, bold: true, color: '#2c3e50' },
                                    { text: pago.moneda || 'Bs', fontSize: 10, color: '#333333', margin: [0, 2, 0, 0] }
                                ],
                                border: [false, false, false, false]
                            }
                        ]
                    ]
                },
                layout: {
                    hLineWidth: () => 0,
                    vLineWidth: (i: number) => (i === 0) ? 4 : 0,
                    vLineColor: () => '#3498db',
                    paddingLeft: () => 15,
                    paddingTop: () => 10,
                    paddingBottom: () => 10,
                    fillColor: () => '#f8f9fa'
                },
                margin: [0, 0, 0, 20]
            });

            // Treatments Table
            if (pago.detalles && pago.detalles.length > 0) {
                const tableBody: any[] = [
                    [
                        { text: 'Paciente', style: 'tableHeader', alignment: 'left' },
                        { text: 'Tratamiento', style: 'tableHeader', alignment: 'left' },
                        { text: 'Pza', style: 'tableHeader', alignment: 'center' },
                        { text: 'Precio', style: 'tableHeader', alignment: 'right' },
                        { text: 'Costo Lab.', style: 'tableHeader', alignment: 'right' },
                        { text: 'Fact.', style: 'tableHeader', alignment: 'center' },
                        { text: 'Imp. 16%', style: 'tableHeader', alignment: 'right' },
                        { text: 'Neto', style: 'tableHeader', alignment: 'right' },
                        { text: 'Com%', style: 'tableHeader', alignment: 'right' },
                        { text: 'Pago Doc.', style: 'tableHeader', alignment: 'right' }
                    ]
                ];

                pago.detalles.forEach((detalle: any, index: number) => {
                    const rowColor = index % 2 === 0 ? '#f8f9fa' : null;
                    const hc = detalle.historiaClinica;
                    const paciente = hc?.paciente
                        ? `${hc.paciente.nombre} ${hc.paciente.paterno}`
                        : 'Desconocido';

                    // Calculos para la vista
                    const base = Number(hc?.precio) || 0;
                    const desc = Number(detalle.descuento) || 0;
                    const lab = Number(detalle.costo_laboratorio) || 0;
                    const com = Number(detalle.comision) || 0;
                    const factura = Boolean(detalle.fecha_pago_paciente && detalle.forma_pago_paciente); // Simple check if paid
                    
                    let taxableBase = base - ((base * desc) / 100);
                    if (factura) taxableBase = taxableBase * 0.84;
                    const neto = Math.max(0, taxableBase - lab);
                    const impuestoStr = factura ? (taxableBase * 0.16).toFixed(2) : '-';

                    tableBody.push([
                        { text: paciente, fontSize: 8, alignment: 'left', fillColor: rowColor },
                        { text: hc?.tratamiento || '-', fontSize: 8, alignment: 'left', fillColor: rowColor },
                        { text: hc?.pieza || '-', fontSize: 8, alignment: 'center', fillColor: rowColor },
                        { text: base.toFixed(2), fontSize: 8, alignment: 'right', fillColor: rowColor },
                        { text: lab > 0 ? lab.toFixed(2) : '-', fontSize: 8, alignment: 'right', fillColor: rowColor },
                        { text: factura ? 'SI' : 'NO', fontSize: 8, alignment: 'center', fillColor: rowColor },
                        { text: impuestoStr, fontSize: 8, alignment: 'right', color: '#e74c3c', fillColor: rowColor },
                        { text: neto.toFixed(2), fontSize: 8, alignment: 'right', color: '#2980b9', fillColor: rowColor },
                        { text: com > 0 ? com + '%' : '-', fontSize: 8, alignment: 'right', fillColor: rowColor },
                        { text: Number(detalle.total).toFixed(2), fontSize: 8, alignment: 'right', bold: true, color: '#27ae60', fillColor: rowColor }
                    ]);
                });

                content.push({
                    table: {
                        headerRows: 1,
                        widths: ['*', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
                        body: tableBody
                    },
                    layout: {
                        hLineWidth: () => 0.5,
                        vLineWidth: () => 0.5,
                        hLineColor: () => '#dddddd',
                        vLineColor: () => '#dddddd',
                        paddingLeft: () => 5,
                        paddingRight: () => 5,
                        paddingTop: () => 3,
                        paddingBottom: () => 3
                    },
                    margin: [0, 0, 0, 15]
                });
            }

            // Totals Section
            const totalsContent: any[] = [];

            totalsContent.push({
                columns: [
                    { width: '*', text: '' }, // Spacer
                    {
                        width: 'auto',
                        table: {
                            widths: ['auto', 100],
                            body: [
                                [
                                    { text: 'Subtotal:', alignment: 'right', fontSize: 10, bold: true },
                                    { text: `${Number(pago.total).toFixed(2)} ${currencySymbol}`, alignment: 'right', fontSize: 10 }
                                ]
                            ]
                        },
                        layout: 'noBorders'
                    }
                ],
                margin: [0, 0, 0, 2]
            });



            totalsContent.push({
                columns: [
                    { width: '*', text: '' }, // Spacer
                    {
                        width: 'auto',
                        table: {
                            widths: ['auto', 100],
                            body: [
                                [
                                    { text: 'Total Pagado:', alignment: 'right', fontSize: 11, bold: true },
                                    { text: `${Number(pago.total).toFixed(2)} ${currencySymbol}`, alignment: 'right', fontSize: 11, bold: true }
                                ]
                            ]
                        },
                        layout: 'noBorders'
                    }
                ],
                margin: [0, 5, 0, 0]
            });

            content.push({ stack: totalsContent, margin: [0, 0, 0, 20] });

            const docDefinition = {
                defaultStyle: {
                    font: 'Helvetica',
                    fontSize: 10
                },
                content: content,
                footer: (currentPage: number, pageCount: number) => {
                    const footerStack: any[] = [];

                    // Signature only on the last page
                    if (currentPage === pageCount) {
                        footerStack.push({
                            stack: [
                                { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: '#000' }] },
                                { text: 'Firma y Sello', alignment: 'center', fontSize: 12, margin: [0, 5, 0, 0] }
                            ],
                            alignment: 'center',
                            margin: [0, 0, 0, 30] // Spacing before footer line
                        });
                    }

                    // Standard Footer (Line + Date) - Removed Page Number as requested
                    footerStack.push({
                        canvas: [
                            { type: 'line', x1: 56, y1: 0, x2: 538, y2: 0, lineWidth: 0.5, lineColor: '#333333' }
                        ],
                        margin: [0, 0, 0, 10]
                    });

                    footerStack.push({
                        columns: [
                            {
                                text: '', // Empty left side
                                width: '*'
                            },
                            {
                                text: `Fecha de impresión: ${new Date().toLocaleString('es-ES')}`,
                                fontSize: 9,
                                color: '#666666',
                                alignment: 'right',
                                width: 'auto'
                            }
                        ],
                        margin: [56, 0, 42, 0]
                    });

                    return {
                        stack: footerStack
                    };
                },
                styles: {
                    tableHeader: {
                        bold: true,
                        fontSize: 10,
                        color: 'white',
                        fillColor: '#3498db'
                    }
                },
                pageSize: 'A4',
                pageMargins: [56, 56, 42, 110]
            };

            const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
            const chunks: any[] = [];
            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err: any) => reject(err));
            pdfDoc.end();
        });
    }

    private formatDate(dateString: string): string {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }
}
