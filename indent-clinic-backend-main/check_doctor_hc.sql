SELECT id, nombre, paterno, materno FROM odontologos WHERE paterno ILIKE '%Cabrera%' OR nombre ILIKE '%Ricardo%';
SELECT id, "odontologoId", "pacienteId", cancelado, descuento, precio, "proformaDetalleId" FROM historia_clinica WHERE id = 52;
SELECT id, monto, descuento, "historiaClinicaId" FROM pagos WHERE "historiaClinicaId" = 52;
