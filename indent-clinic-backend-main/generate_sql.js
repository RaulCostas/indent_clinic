const fs = require('fs');

const schema = JSON.parse(fs.readFileSync('supabase_schema.json', 'utf8'));

const tables = Object.keys(schema.definitions);

let sql = `-- SQL Script to enable Row Level Security (RLS) on all tables\n\n`;

for (const table of tables) {
    sql += `ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY;\n`;
}

fs.writeFileSync('enable_rls.sql', sql);
console.log('SQL script generated at enable_rls.sql');
