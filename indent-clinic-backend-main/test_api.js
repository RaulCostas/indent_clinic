
const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('http://localhost:3000/clinicas');
        console.log("Clinicas:", JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error("Error:", err.message);
        if (err.response) {
            console.error("Response data:", err.response.data);
        }
    }
}
test();
