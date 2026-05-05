
SELECT COUNT(*)
FROM agenda a
WHERE a.fecha <= '2026-05-03' 
  AND LOWER(a.estado) = 'atendido'
  AND NOT EXISTS (
      SELECT 1 
      FROM historia_clinica hc 
      WHERE hc."pacienteId" = a."pacienteId" 
        AND hc.fecha = a.fecha
  );
