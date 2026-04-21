-- Migration script to standardize estado values in forma_pago table
-- Changes 'Activo' to 'activo' and 'Inactivo' to 'inactivo' for consistency

UPDATE forma_pago 
SET estado = 'activo' 
WHERE estado = 'Activo';

UPDATE forma_pago 
SET estado = 'inactivo' 
WHERE estado = 'Inactivo';
