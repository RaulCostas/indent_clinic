const axios = require('axios');

async function testPost() {
    const payload = {
        fecha: '2026-04-10',
        envio_retorno: 'Envio',
        observaciones: 'Test from script',
        trabajoLaboratorioId: 2, // Based on URL /seguimiento/2
        clinicaId: 1 // Probable default
    };

    try {
        console.log('Sending POST to http://localhost:3000/seguimiento-trabajo...');
        const res = await axios.post('http://localhost:3000/seguimiento-trabajo', payload);
        console.log('Success:', res.status, res.data);
    } catch (err) {
        console.error('FAILED with status:', err.response?.status);
        console.error('Error detail:', JSON.stringify(err.response?.data, null, 2));
    }
}

testPost();
