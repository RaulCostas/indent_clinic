-- Script para eliminar columnas no utilizadas en la tabla pacientes
ALTER TABLE pacientes 
DROP COLUMN IF EXISTS access_id,
DROP COLUMN IF EXISTS casilla,
DROP COLUMN IF EXISTS direccion_oficina,
DROP COLUMN IF EXISTS telefono_oficina,
DROP COLUMN IF EXISTS poliza;
