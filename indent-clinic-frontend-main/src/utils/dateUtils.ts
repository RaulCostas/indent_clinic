/**
 * Formats a date string or Date object to 'DD/MM/YYYY' format.
 * If the input is null or invalid, returns '-'.
 * 
 * @param date - The date to format (string 'YYYY-MM-DD' or Date object)
 * @returns formatted date string 'DD/MM/YYYY'
 */
export const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return '-';

    const d = new Date(date);
    // Check if valid date
    if (isNaN(d.getTime())) return '-';

    // Use UTC methods to avoid timezone shifts if the input is YYYY-MM-DD (UTC midnight)
    // However, if standard JS Date parsing assumes UTC for YYYY-MM-DD, 
    // displaying with getUTCDate/Month/FullYear is safer to preserve the exact date stored.

    // BUT: If the input is an ISO string with time, we might want local time.
    // Given the context of "Events" or "Transactions", standardizing on "as recorded" is best.
    // Let's stick to a simple UTC-based extraction for YYYY-MM-DD strings to avoid "Day - 1" issues.

    // If input is YYYY-MM-DD string (e.g. from Postgres date column), it parses as UTC midnight.
    // getDay() would return local day which might be previous day in Western Hemisphere.
    // So we use getUTCDate().

    // Heuristic: If string looks like a plain date, use UTC parts.
    // Heuristic: If string looks like a plain date or ISO date, use extracted parts to avoid TZ issues.
    if (typeof date === 'string') {
        const datePart = date.split('T')[0];
        if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = datePart.split('-').map(Number);
            return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
        }
    }

    // For Date objects, assuming they represent a date without time (e.g. from a 'date' column),
    // we should use UTC methods because 'date' columns are usually parsed as UTC midnight.
    // If we use local methods (getDate), it will shift to previous day in Western hemisphere.
    const day = d.getUTCDate().toString().padStart(2, '0');
    const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = d.getUTCFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * Returns the current date in 'YYYY-MM-DD' format, adjusted for the local timezone.
 * Useful for initializing <input type="date"> values.
 */
export const getLocalDateString = (): string => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().split('T')[0];
};

/**
 * Formats a date string or Date object to 'DD/MM/YYYY HH:MM' format.
 * 
 * @param date - The date to format
 * @returns formatted datetime string 'DD/MM/YYYY HH:MM'
 */
export const formatDateTime = (date: string | Date | undefined | null): string => {
    if (!date) return '-';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Returns the full day name of a date in Spanish.
 * 
 * @param date - The date to get the day name from
 * @returns full day name in Spanish (e.g. 'Martes')
 */
export const getDayName = (date: string | Date | undefined | null): string => {
    if (!date) return '-';
    
    // Create date and ensure it's treated as local time if it's YYYY-MM-DD
    const d = typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/) 
        ? new Date(date + 'T00:00:00') 
        : new Date(date);
        
    if (isNaN(d.getTime())) return '-';
    
    return new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(d);
};

export default {
    formatDate,
    getLocalDateString,
    formatDateTime,
    getDayName
};
