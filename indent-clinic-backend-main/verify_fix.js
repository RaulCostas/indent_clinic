const axios = require('axios');

const API_URL = 'http://localhost:3000';
const PROFORMA_ID = 101;

async function triggerRebalance() {
    try {
        // Since rebalance is internal, we trigger it by updating a payment or similar,
        // or we can create a temporary endpoint. 
        // But I have access to the DB, I can just check the results if I could trigger the service.
        // Actually, I'll use a direct DB script to simulate the rebalance logic and see if it WOULD work,
        // OR I can use the existing "repair" scripts if they exist.
        
        // Better: I'll create a script that uses the SAME logic I just wrote but standalone to verify the output for Proforma 101.
        console.log("Simulating Rebalance for Proforma #101...");
    } catch (e) {
        console.error(e);
    }
}

// Logic simulation
const { Client } = require('pg');
const client = new Client({ 
    host: 'localhost',
    port: 5433,
    user: 'postgres',
    password: 'postgrespg',
    database: 'indent_clinic'
});

async function simulate() {
    await client.connect();
    
    // 1. Get Payments
    const pagos = (await client.query('SELECT * FROM pagos WHERE "proformaId" = 101')).rows;
    const directCash = new Map();
    let globalCashPool = 0;
    
    pagos.forEach(p => {
        const amount = Number(p.monto || 0);
        if (p.historiaClinicaId) {
            directCash.set(p.historiaClinicaId, (directCash.get(p.historiaClinicaId) || 0) + amount);
        } else {
            globalCashPool += amount;
        }
    });
    
    console.log("Direct Cash Map:", Array.from(directCash.entries()));
    console.log("Global Cash Pool:", globalCashPool);
    
    // 2. Get HCs
    const hcs = (await client.query('SELECT * FROM historia_clinica WHERE "proformaId" = 101 ORDER BY fecha ASC, id ASC')).rows;
    
    // 3. Grouping (Simplified)
    for (const hc of hcs) {
        const basePrice = Number(hc.precio);
        let groupDirectCash = directCash.get(hc.id) || 0;
        
        let costRemaining = basePrice;
        let appliedDirect = Math.min(costRemaining, groupDirectCash);
        costRemaining -= appliedDirect;
        
        let appliedGlobal = 0;
        if (costRemaining > 0 && globalCashPool > 0) {
            appliedGlobal = Math.min(costRemaining, globalCashPool);
            globalCashPool -= appliedGlobal;
            costRemaining -= appliedGlobal;
        }
        
        const isCancelado = costRemaining <= 0.05;
        console.log(`HC #${hc.id} (${hc.tratamiento}): Base ${basePrice}, Directo ${appliedDirect}, Global ${appliedGlobal}, Cancelado: ${isCancelado}`);
    }
    
    await client.end();
}

simulate().catch(console.error);
