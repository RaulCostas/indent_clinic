SELECT 
    pac."clinicaId" as patient_clinic_id, 
    count(p.id) as payment_count 
FROM pagos p 
JOIN pacientes pac ON p."pacienteId" = pac.id 
GROUP BY pac."clinicaId";
