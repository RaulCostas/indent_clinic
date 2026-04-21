UPDATE historia_clinica 
SET cancelado = true, 
    descuento = 30.00, 
    "precioConDescuento" = 50.00 
WHERE id = 52;

SELECT id, cancelado, descuento, "precioConDescuento" FROM historia_clinica WHERE id = 52;
