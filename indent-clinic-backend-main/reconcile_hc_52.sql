-- Reconciliación total para HC 52
UPDATE historia_clinica 
SET cancelado = true, 
    pagado = 'NO', 
    descuento = 30.00, 
    precio = 80.00,
    "precioConDescuento" = 50.00,
    "estadoTratamiento" = 'terminado'
WHERE id = 52;

-- Actualizamos el pago asociado (ID 86 según diagnósticos previos, pero usamos historiaClinicaId para seguridad)
UPDATE pagos 
SET monto = 50.00, 
    descuento = 30.00 
WHERE "historiaClinicaId" = 52;

-- Verificación final
SELECT id, cancelado, pagado, descuento, "precioConDescuento" FROM historia_clinica WHERE id = 52;
SELECT id, monto, descuento, "historiaClinicaId" FROM pagos WHERE "historiaClinicaId" = 52;
