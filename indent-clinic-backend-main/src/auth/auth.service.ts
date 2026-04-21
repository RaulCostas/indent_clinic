import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private mailService: MailService,
    ) { }

    async signIn(email: string, pass: string): Promise<{ access_token: string, user: any }> {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Correo electrónico o contraseña incorrectos.');
        }

        if (user.estado && user.estado.toLowerCase() !== 'activo') {
            throw new UnauthorizedException('Su cuenta está inactiva. Por favor contacte al administrador.');
        }

        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Correo electrónico o contraseña incorrectos.');
        }
        const payload = { sub: user.id, username: user.email };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                permisos: user.permisos,
                foto: user.foto
            },
        };
    }

    async forgotPassword(email: string): Promise<{ message: string }> {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new NotFoundException('El correo electrónico no está registrado o es inválido.');
        }

        // Generate random password (8 chars)
        const tempPassword = Math.random().toString(36).slice(-8);

        // Update user (UsersService already hashes the password inside update())
        await this.usersService.update(user.id, { password: tempPassword, foto: user.foto, estado: user.estado });

        // Enviar correo real
        const emailSent = await this.mailService.sendPasswordRecovery(email, tempPassword);

        if (!emailSent) {
            console.error(`[Mail] Falló el envío de correo de recuperación a ${email}`);
        } else {
            console.log(`[Mail] Correo de recuperación enviado a ${email}`);
        }

        return { message: 'Si el correo existe, se enviará una nueva contraseña.' };
    }
}
