const fs = require('fs');
const content = fs.readFileSync('src/components/PrecioLaboratorioModal.tsx', 'utf8');
const replacement = `} catch (error: any) {
            console.error('Error saving precio:', error);
            const errorMessage = error.response?.data?.message || 'Error al guardar el precio';
            Swal.fire({
                icon: 'error',
                title: 'Aviso',
                text: Array.isArray(errorMessage) ? errorMessage[0] : errorMessage,
                background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#fff',
                color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#000',
            });
        } finally {`;
const out = content.replace(/\} catch \(error\) \{[\s\S]*?\} finally \{/, replacement);
fs.writeFileSync('src/components/PrecioLaboratorioModal.tsx', out);
