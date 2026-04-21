/**
 * Retorna la fecha actual en formato YYYY-MM-DD ajustada a la zona horaria de Bolivia (GMT-4).
 * Útil para mantener consistencia entre registros automáticos del backend y filtrado local del frontend.
 */
export function getBoliviaDate(): string {
    const ahora = new Date();
    // Bolivia (America/La_Paz) no tiene horario de verano, es siempre GMT-4
    const offsetBolivia = -4; 
    const milisegundosBolivia = ahora.getTime() + (offsetBolivia * 60 * 60 * 1000);
    const fechaBolivia = new Date(milisegundosBolivia);
    
    return fechaBolivia.toISOString().split('T')[0];
}

/**
 * Retorna un objeto Date ajustado a Bolivia para operaciones que requieran el objeto completo.
 */
export function getBoliviaFullDate(): Date {
    const ahora = new Date();
    const offsetBolivia = -4; 
    return new Date(ahora.getTime() + (offsetBolivia * 60 * 60 * 1000));
}
