async function test() {
    try {
        console.log('Probando endpoint de liquidación con fetch...');
        const response = await fetch('http://localhost:3000/ventas-productos/comisiones/pagar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                personalId: 1,
                year: 2026,
                month: 4,
                formaPagoId: 1,
                total: 100,
                clinicaId: 1
            })
        });
        
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();
