import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class ChangePasswordDto {
    @IsNotEmpty({ message: 'La contraseña actual es requerida' })
    @IsString()
    currentPassword: string;

    @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
    @IsString()
    @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
    newPassword: string;

    @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
    @IsString()
    confirmPassword: string;
}
