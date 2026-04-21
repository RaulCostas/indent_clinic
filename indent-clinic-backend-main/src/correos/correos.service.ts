import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Correo } from './entities/correo.entity';
import { CreateCorreoDto } from './dto/create-correo.dto';

@Injectable()
export class CorreosService {
    constructor(
        @InjectRepository(Correo)
        private correosRepository: Repository<Correo>,
    ) { }

    create(createCorreoDto: CreateCorreoDto) {
        const correo = this.correosRepository.create({
            remitente: { id: createCorreoDto.remitente_id },
            destinatario: { id: createCorreoDto.destinatario_id },
            copia: createCorreoDto.copia_id ? { id: createCorreoDto.copia_id } : undefined,
            asunto: createCorreoDto.asunto,
            mensaje: createCorreoDto.mensaje,
        });
        return this.correosRepository.save(correo);
    }

    // Inbox: messages where user is recipient OR in copy
    async findInbox(userId: number) {
        return this.correosRepository.find({
            where: [
                { destinatario: { id: userId } },
                { copia: { id: userId } }
            ],
            relations: ['remitente', 'destinatario', 'copia'],
            order: { fecha_envio: 'DESC' }
        });
    }

    async findUnreadCount(userId: number) {
        return this.correosRepository.count({
            where: [
                { destinatario: { id: userId }, leido_destinatario: false },
                { copia: { id: userId }, leido_copia: false }
            ]
        });
    }

    // Sent: messages where user is sender
    async findSent(userId: number) {
        return this.correosRepository.find({
            where: { remitente: { id: userId } },
            relations: ['remitente', 'destinatario', 'copia'],
            order: { fecha_envio: 'DESC' }
        });
    }

    async findOne(id: number) {
        return this.correosRepository.findOne({
            where: { id },
            relations: ['remitente', 'destinatario', 'copia']
        });
    }

    async markAsRead(id: number, userId: number) {
        const correo = await this.findOne(id);
        if (!correo) throw new Error('Correo not found');

        if (correo.destinatario.id === userId) {
            correo.leido_destinatario = true;
        } else if (correo.copia?.id === userId) {
            correo.leido_copia = true;
        }

        return this.correosRepository.save(correo);
    }
}
