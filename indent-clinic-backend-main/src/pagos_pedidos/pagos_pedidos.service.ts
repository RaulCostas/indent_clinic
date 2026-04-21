import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PagosPedidos } from './entities/pagos_pedidos.entity';
import { CreatePagosPedidosDto } from './dto/create-pagos_pedidos.dto';
import { Pedidos } from '../pedidos/entities/pedidos.entity';

@Injectable()
export class PagosPedidosService {
    constructor(
        @InjectRepository(PagosPedidos)
        private pagosPedidosRepository: Repository<PagosPedidos>,
        @InjectRepository(Pedidos)
        private pedidosRepository: Repository<Pedidos>,
    ) { }

    async create(createDto: CreatePagosPedidosDto) {
        const pedido = await this.pedidosRepository.findOne({ where: { id: createDto.idPedido } });
        if (!pedido) {
            throw new NotFoundException(`Pedido ${createDto.idPedido} not found`);
        }

        const pago = this.pagosPedidosRepository.create(createDto);
        const savedPago = await this.pagosPedidosRepository.save(pago);

        // Update pedido status to Pagado automatically? 
        // User requested a separate module, but likely they want sync. 
        // For now, I'll just save the record. Logic can be expanded.
        pedido.Pagado = true;
        await this.pedidosRepository.save(pedido);

        return savedPago;
    }

    async findAll(fecha?: string, startDate?: string, endDate?: string, clinicaId?: number) {
        const options: any = {
            relations: ['pedido', 'pedido.proveedor'],
            where: {},
            order: { fecha: 'DESC' }
        };

        if (clinicaId) {
            options.where.clinicaId = clinicaId;
        }

        // Use Between with explicit time strings
        if (startDate && endDate) {
            options.where.fecha = Between(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
        } else if (fecha) {
            options.where.fecha = Between(`${fecha} 00:00:00`, `${fecha} 23:59:59`);
        }
        return this.pagosPedidosRepository.find(options);
    }

    async findOne(id: number) {
        const pago = await this.pagosPedidosRepository.findOne({
            where: { id },
            relations: ['pedido']
        });
        if (!pago) throw new NotFoundException('Pago not found');
        return pago;
    }

    async update(id: number, updateDto: any) {
        const pago = await this.findOne(id);
        Object.assign(pago, updateDto);
        return this.pagosPedidosRepository.save(pago);
    }

    async remove(id: number) {
        const pago = await this.findOne(id);

        // Revert Pedido status to unpaid if payment is deleted
        if (pago.pedido) {
            pago.pedido.Pagado = false;
            await this.pedidosRepository.save(pago.pedido);
        } else if (pago.idPedido) {
            const pedido = await this.pedidosRepository.findOne({ where: { id: pago.idPedido } });
            if (pedido) {
                pedido.Pagado = false;
                await this.pedidosRepository.save(pedido);
            }
        }

        return this.pagosPedidosRepository.remove(pago);
    }

    async findByPedido(idPedido: number) {
        return this.pagosPedidosRepository.findOne({
            where: { idPedido }
        });
    }
}
