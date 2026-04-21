import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { JwtConstants } from './constants';
import { MailService } from './mail.service';

@Module({
    imports: [
        UsersModule,
        JwtModule.register({
            global: true,
            secret: JwtConstants.secret,
            signOptions: { expiresIn: '60m' },
        }),
    ],
    providers: [AuthService, MailService],
    controllers: [AuthController],
    exports: [AuthService],
})
export class AuthModule { }
