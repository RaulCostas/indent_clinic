
export const formatDateSpanish = (dateString: string): string => {
    // const date = new Date(dateString);
    // Adjust for timezone if necessary, but assuming dateString is YYYY-MM-DD or ISO
    // If it's YYYY-MM-DD, new Date() might treat it as UTC. 
    // The user input 04/12/2025 and saw 03/12/2025, so we are dealing with timezone issues.
    // Best to parse manually to avoid timezone shifts.
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);

    const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    const days = [
        'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
    ];

    // Create date object using local time components to get the correct day of week
    const localDate = new Date(year, month - 1, day);
    const dayOfWeek = days[localDate.getDay()];

    return `La Paz ${dayOfWeek}, ${day} de ${months[month - 1]} de ${year}`;
};

export const formatDateUTC = (dateString: string): string => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
};

export const numberToWords = (amount: number): string => {
    const units = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const tens = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const teens = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
    const hundreds = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

    const convertGroup = (n: number): string => {
        let output = '';

        if (n === 100) return 'CIEN';

        if (n >= 100) {
            output += hundreds[Math.floor(n / 100)] + ' ';
            n %= 100;
        }

        if (n >= 20) {
            output += tens[Math.floor(n / 10)];
            if (n % 10 > 0) output += ' Y ' + units[n % 10];
        } else if (n >= 10) {
            output += teens[n - 10];
        } else if (n > 0) {
            output += units[n];
        }

        return output.trim();
    };

    const integerPart = Math.floor(amount);

    if (integerPart === 0) return 'CERO';

    let words = '';

    if (integerPart >= 1000000) {
        const millions = Math.floor(integerPart / 1000000);
        words += (millions === 1 ? 'UN MILLON' : convertGroup(millions) + ' MILLONES') + ' ';
        // Remainder
        const remainder = integerPart % 1000000;
        if (remainder > 0) {
            if (remainder >= 1000) {
                const thousands = Math.floor(remainder / 1000);
                words += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
                words += convertGroup(remainder % 1000);
            } else {
                words += convertGroup(remainder);
            }
        }
    } else if (integerPart >= 1000) {
        const thousands = Math.floor(integerPart / 1000);
        words += (thousands === 1 ? 'MIL' : convertGroup(thousands) + ' MIL') + ' ';
        words += convertGroup(integerPart % 1000);
    } else {
        words += convertGroup(integerPart);
    }

    return words.trim();
};

/**
 * Retorna la URL del logo manejando casos de Base64, URLs absolutas (Supabase) 
 * y rutas relativas (backend local).
 */
export const getLogoUrl = (logo: string | undefined | null): string => {
    if (!logo) return '';
    
    // Si ya es Base64 o una URL absoluta (http/https), retornarla tal cual
    if (logo.startsWith('data:image') || logo.startsWith('http')) {
        return logo;
    }

    // Si es una ruta relativa, anteponer el base URL de la API
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const logoPath = logo.startsWith('/') ? logo : `/${logo}`;
    
    return `${baseUrl}${logoPath}`;
};
