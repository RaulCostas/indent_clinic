import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductoComercial } from './entities/producto_comercial.entity';
import { CreateProductoComercialDto } from './dto/create-producto_comercial.dto';
import { UpdateProductoComercialDto } from './dto/update-producto_comercial.dto';

@Injectable()
export class ProductosComercialesService {
    constructor(
        @InjectRepository(ProductoComercial)
        private readonly productoRepository: Repository<ProductoComercial>,
    ) {}

    async create(createDto: CreateProductoComercialDto): Promise<ProductoComercial> {
        const producto = this.productoRepository.create(createDto);
        return await this.productoRepository.save(producto);
    }

    async findAll(search?: string, page: number = 1, limit: number = 10, clinicaId?: number) {
        const queryBuilder = this.productoRepository.createQueryBuilder('producto')
            .leftJoinAndSelect('producto.clinica', 'clinica')
            .where('producto.estado = :estado', { estado: 'activo' });

        if (clinicaId) {
            queryBuilder.andWhere('producto.clinicaId = :clinicaId', { clinicaId });
        }

        if (search) {
            queryBuilder.andWhere('producto.nombre ILIKE :search', { search: `%${search}%` });
        }

        const [data, total] = await queryBuilder
            .orderBy('producto.nombre', 'ASC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: number): Promise<ProductoComercial> {
        const producto = await this.productoRepository.findOne({
            where: { id },
            relations: ['clinica']
        });
        if (!producto) throw new NotFoundException(`Producto #${id} no encontrado`);
        return producto;
    }

    async update(id: number, updateDto: UpdateProductoComercialDto): Promise<ProductoComercial> {
        const producto = await this.findOne(id);
        this.productoRepository.merge(producto, updateDto);
        return await this.productoRepository.save(producto);
    }

    async remove(id: number): Promise<void> {
        const producto = await this.findOne(id);
        producto.estado = 'inactivo';
        await this.productoRepository.save(producto);
    }

    async updateStock(id: number, cantidad: number, esSuma: boolean): Promise<void> {
        const producto = await this.findOne(id);
        if (esSuma) {
            producto.stock_actual += cantidad;
        } else {
            if (producto.stock_actual < cantidad) {
                throw new Error(`Stock insuficiente para el producto: ${producto.nombre}`);
            }
            producto.stock_actual -= cantidad;
        }
        await this.productoRepository.save(producto);
    }
}
