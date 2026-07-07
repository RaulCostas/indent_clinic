const { Client } = require('pg');

async function run() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'postgres',
        password: 'postgrespg',
        database: 'indent_clinic'
    });

    await client.connect();
    console.log('Connected to database. Starting resync...');

    try {
        // Fetch all clinical history records
        const hcRowsRes = await client.query(`
            SELECT id, "pacienteId", "proformaDetalleId", pieza, precio, "estadoTratamiento" 
            FROM historia_clinica 
            ORDER BY id ASC;
        `);
        const hcs = hcRowsRes.rows;
        console.log(`Found ${hcs.length} clinical history records to process.`);

        const processedIds = new Set();
        let syncCount = 0;

        for (const hc of hcs) {
            if (processedIds.has(hc.id)) {
                continue;
            }

            const pId = hc.pacienteId;
            const detId = hc.proformaDetalleId;
            let siblingsIds = [hc.id];
            let targetPrice = Number(hc.precio || 0);

            if (detId) {
                // Fetch proforma_detalle quantity
                const detRes = await client.query(
                    `SELECT cantidad FROM proforma_detalle WHERE id = $1`,
                    [detId]
                );
                const cantidad = detRes.rows[0] ? Number(detRes.rows[0].cantidad) : 1;

                if (cantidad > 1) {
                    const pieza = hc.pieza;
                    const siblingsRes = await client.query(
                        `SELECT id, precio FROM historia_clinica 
                         WHERE "pacienteId" = $1 AND "proformaDetalleId" = $2 AND COALESCE(pieza, '') = COALESCE($3, '')`,
                        [pId, detId, pieza]
                    );
                    siblingsIds = siblingsRes.rows.map(s => s.id);
                    targetPrice = siblingsRes.rows.length > 0 
                        ? Math.max(...siblingsRes.rows.map(s => Number(s.precio || 0))) 
                        : Number(hc.precio || 0);
                } else {
                    const siblingsRes = await client.query(
                        `SELECT id, precio FROM historia_clinica 
                         WHERE "pacienteId" = $1 AND "proformaDetalleId" = $2`,
                        [pId, detId]
                    );
                    siblingsIds = siblingsRes.rows.map(s => s.id);
                    targetPrice = siblingsRes.rows.length > 0 
                        ? Math.max(...siblingsRes.rows.map(s => Number(s.precio || 0))) 
                        : Number(hc.precio || 0);
                }
            }

            // Mark all siblings as processed
            siblingsIds.forEach(id => processedIds.add(id));

            // Sum payments and discounts
            const paymentsRes = await client.query(
                `SELECT 
                    SUM(CAST(monto AS NUMERIC)) as total,
                    SUM(CAST(COALESCE(descuento, 0) AS NUMERIC)) as "totalDescuento"
                 FROM pagos 
                 WHERE "historiaClinicaId" = ANY($1)`,
                [siblingsIds]
            );
            const totalPagadoGrupo = Number(paymentsRes.rows[0]?.total || 0);
            const totalDescuentoGrupo = Number(paymentsRes.rows[0]?.totalDescuento || 0);

            const netPriceGrupo = targetPrice - totalDescuentoGrupo;
            const isCancelado = totalPagadoGrupo >= (netPriceGrupo - 0.05);

            const montoPorHermano = totalPagadoGrupo / siblingsIds.length;
            const descuentoPorHermano = totalDescuentoGrupo / siblingsIds.length;
            const precioHermano = targetPrice / siblingsIds.length;
            const precioConDescuentoPorHermano = precioHermano - descuentoPorHermano;
            const saldoPorHermano = Math.max(0, precioConDescuentoPorHermano - montoPorHermano);

            // Update all siblings in the database
            await client.query(
                `UPDATE historia_clinica 
                 SET cancelado = $1, 
                     "montoPagado" = $2,
                     saldo = $3,
                     descuento = $4,
                     "precioConDescuento" = $5 
                 WHERE id = ANY($6)`,
                [isCancelado, montoPorHermano, saldoPorHermano, descuentoPorHermano, precioConDescuentoPorHermano, siblingsIds]
            );

            syncCount++;
        }

        console.log(`Successfully resynced all clinical history records. Total groups processed: ${syncCount}`);

    } catch (err) {
        console.error('Error during resync:', err);
    } finally {
        await client.end();
    }
}

run();
