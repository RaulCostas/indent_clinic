@echo off
set PGPASSWORD=postgrespg
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5433 -U postgres -d indent_clinic -c "SELECT hc.id FROM historia_clinica hc LEFT JOIN pagos_detalle_doctores pd ON pd.\"historiaClinicaId\" = hc.id WHERE hc.\"doctorId\" = 4 AND hc.pagado = 'NO' AND hc.\"estadoTratamiento\" = 'terminado' AND pd.id IS NULL"
pause
