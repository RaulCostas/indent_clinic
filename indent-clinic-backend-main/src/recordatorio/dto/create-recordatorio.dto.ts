export class CreateRecordatorioDto {
    tipo: 'personal' | 'consultorio';
    fecha: string;
    hora: string;
    mensaje: string;
    repetir: 'Mensual' | 'Anual' | 'Solo una vez';
    estado?: 'activo' | 'inactivo';
    usuarioId?: number;
}
