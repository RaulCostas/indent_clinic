SELECT 
    p.fecha,
    p.monto,
    p.moneda,
    pac.nombre,
    pac.paterno,
    pac.materno,
    p.observaciones
FROM pagos p
JOIN pacientes pac ON p."pacienteId" = pac.id
WHERE pac."clinicaId" = 3
  AND p.fecha BETWEEN '2026-04-01' AND '2026-04-09'
ORDER BY p.fecha ASC;
