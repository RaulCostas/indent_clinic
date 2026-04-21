export class CreateContactoDto {
    contacto: string;
    celular?: string;
    telefono?: string;
    email?: string;
    direccion?: string;
    estado?: 'activo' | 'inactivo';
}
