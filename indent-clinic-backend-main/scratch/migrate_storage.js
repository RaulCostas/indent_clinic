const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Variables SUPABASE_URL o SUPABASE_KEY no encontradas en el entorno!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const bucketName = 'clinica-media';
const outputDir = '/app/uploads/clinica-media';

async function downloadFolder(folderPath = '') {
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase.storage.from(bucketName).list(folderPath, {
      limit,
      offset
    });
    if (error) {
      console.error('Error listando carpeta:', folderPath, error);
      return;
    }
    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;
      if (!item.id) {
        // Es un directorio, buscar recursivamente
        await downloadFolder(itemPath);
      } else {
        // Es un archivo, descargarlo
        const targetPath = path.join(outputDir, itemPath);
        if (fs.existsSync(targetPath)) {
          console.log(`Omitiendo existente: ${itemPath}`);
          continue;
        }
        console.log(`Descargando: ${itemPath}`);
        const { data: fileData, error: fileError } = await supabase.storage.from(bucketName).download(itemPath);
        if (fileError) {
          console.error(`Error al descargar ${itemPath}:`, fileError);
          continue;
        }
        const buffer = Buffer.from(await fileData.arrayBuffer());
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, buffer);
      }
    }

    if (data.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }
}

async function run() {
  console.log(`Iniciando migracion de Storage de Supabase (clinica-media)...`);
  try {
    await downloadFolder();
    console.log('¡Migracion de Storage completada con exito!');
  } catch (err) {
    console.error('Error en la migracion:', err);
  }
}

run();
