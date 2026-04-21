import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST || 'smtp.gmail.com',
            port: Number(process.env.MAIL_PORT) || 587,
            secure: Number(process.env.MAIL_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS,
            },
        });
    }

    async sendPasswordRecovery(email: string, tempPassword: string): Promise<boolean> {
        const mailOptions = {
            from: process.env.MAIL_FROM || '"CLINICAS LENS" <noreply@clinicaslens.com>',
            to: email,
            subject: 'Recuperación de Contraseña - CLINICAS LENS',
            text: `CLINICAS LENS\n\nHola,\n\nHas solicitado restablecer tu contraseña. Tu contraseña temporal es: ${tempPassword}\n\nSe recomienda cambiar esta contraseña una vez hayas ingresado al sistema.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h1 style="color: #1e3a8a; font-size: 28px; font-weight: 800; margin: 0;">CLINICAS LENS</h1>
                        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Gestión Odontológica Inteligente</p>
                    </div>
                    <div style="border-top: 4px solid #3b82f6; padding-top: 20px;">
                        <p style="color: #1e293b; font-size: 16px;">Hola,</p>
                        <p style="color: #475569; font-size: 15px; line-height: 1.6;">Has solicitado restablecer tu contraseña para acceder al sistema. Hemos generado una **contraseña temporal** para ti:</p>
                        
                        <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 20px; border-radius: 10px; text-align: center; margin: 25px 0; border: 1px solid #e2e8f0;">
                            <span style="font-size: 24px; font-weight: 800; color: #1e3a8a; letter-spacing: 2px;">${tempPassword}</span>
                        </div>
 
                        <p style="color: #dc2626; font-size: 14px; font-weight: 600; margin-bottom: 20px;">
                            ⚠️ IMPORTANTE: Se recomienda cambiar esta contraseña una vez hayas ingresado al sistema desde tu perfil.
                        </p>
                    </div>
                    
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 30px; text-align: center;">
                        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Este es un mensaje automático generado por el sistema CLINICAS LENS.</p>
                        <p style="color: #94a3b8; font-size: 11px; margin-top: 4px;">Por favor, no respondas a este correo.</p>
                    </div>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            return true;
        } catch (error) {
            console.error('Error sending email:', error);
            return false;
        }
    }
}
