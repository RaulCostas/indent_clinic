-- Migration: Remove asistente column from historia_clinica
-- Date: 2026-01-14
-- Reason: The asistente column is redundant. The personalId foreign key 
--         provides the same functionality with better data integrity.

-- Drop the asistente column
ALTER TABLE historia_clinica DROP COLUMN asistente;

-- Note: All data should already be using personalId instead of asistente.
-- If you need to verify before running, use:
-- SELECT COUNT(*) FROM historia_clinica WHERE asistente IS NOT NULL AND asistente != '';
