const fs = require('fs');

async function getTables() {
    const url = 'https://vtpdcimxcakktpnqjylc.supabase.co/rest/v1/?apikey=' + 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0cGRjaW14Y2Fra3RwbnFqeWxjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ1MzQxMiwiZXhwIjoyMDkwMDI5NDEyfQ.d9dDZYFleQRufaodFvxEooRaHYl6maCa62vNFJ5E2VU';
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        fs.writeFileSync('supabase_schema.json', JSON.stringify(data, null, 2));
        console.log('Saved to supabase_schema.json');
        
        // Output basic info
        if (data && data.definitions) {
            console.log('Tables:', Object.keys(data.definitions));
        }
    } catch (e) {
        console.error(e);
    }
}

getTables();
