import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PagoTablet } from './entities/pago_tablet.entity';
import { CreatePagoTabletDto } from './dto/create-pago-tablet.dto';
import { Pago } from '../pagos/entities/pago.entity';

@Injectable()
export class PagosTabletService {
  constructor(
    @InjectRepository(PagoTablet)
    private repoTablet: Repository<PagoTablet>,
    @InjectRepository(Pago)
    private repoPagos: Repository<Pago>,
  ) {}

  async create(createDto: any): Promise<PagoTablet> {
    let finalFecha = createDto.fecha;

    if (!finalFecha) {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        finalFecha = `${year}-${month}-${day}`;
    }

    const nuevo = this.repoTablet.create({
        nombre_paciente: createDto.nombre_paciente,
        monto: createDto.monto,
        clinicaId: createDto.clinicaId ? Number(createDto.clinicaId) : undefined,
        formaPago: { id: createDto.formaPagoId },
        fecha: finalFecha,
        observaciones: createDto.observaciones
    });
    return await this.repoTablet.save(nuevo);
  }

  async realizarCruceDiario(clinicaId?: number | null, fecha?: string) {
      let todayStr = '';
      if (fecha) {
          todayStr = fecha;
      } else {
          // Fallback to local today
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          todayStr = `${year}-${month}-${day}`;
      }

      // Fetch PagosTablet for today
      const pagosTablet = await this.repoTablet.find({
          where: clinicaId ? { fecha: todayStr, clinicaId } : { fecha: todayStr },
          relations: ['formaPago']
      });

      // Fetch real Pagos for today
      const queryPagos = this.repoPagos.createQueryBuilder('pago')
        .leftJoinAndSelect('pago.formaPagoRel', 'formaPagoRel')
        .leftJoinAndSelect('pago.paciente', 'paciente')
        .where('pago.fecha = :todayStr', { todayStr });

      if (clinicaId) {
          queryPagos.leftJoin('pago.proforma', 'proforma');
          queryPagos.andWhere('proforma.clinicaId = :clinicaId', { clinicaId });
      }

      const pagosRecepcion = await queryPagos.getMany();

      // Aggregate by Forma de Pago for Tablet
      const tabletAgg: { [key: string]: number } = {};
      pagosTablet.forEach(pt => {
          const fn = pt.formaPago?.forma_pago || 'Desconocido';
          if (!tabletAgg[fn]) tabletAgg[fn] = 0;
          tabletAgg[fn] += Number(pt.monto);
      });

      // Aggregate by Forma de Pago for Recepcion
      const recepcionAgg: { [key: string]: number } = {};
      pagosRecepcion.forEach(pr => {
          // If the real pago has multiple forms or just one `formaPago`, assume one relation
          const fn = pr.formaPagoRel?.forma_pago || 'Desconocido';
          if (!recepcionAgg[fn]) recepcionAgg[fn] = 0;
          recepcionAgg[fn] += Number(pr.monto || 0);
      });

      // Compare
      const allFormas = new Set([...Object.keys(tabletAgg), ...Object.keys(recepcionAgg)]);
      const resultados: any[] = [];
      let matchCompleto = true;

      for (const forma of allFormas) {
          const mTablet = tabletAgg[forma] || 0;
          const mRecepcion = recepcionAgg[forma] || 0;
          const diferencia = mRecepcion - mTablet;

          if (diferencia !== 0) {
              matchCompleto = false;
          }

          resultados.push({
              forma_pago: forma,
              tablet: mTablet,
              recepcion: mRecepcion,
              diferencia,
              cuadra: diferencia === 0
          });
      }

      return {
          match_completo: matchCompleto,
          detalles: resultados,
          lista_tablet: pagosTablet.map(pt => ({
              id: pt.id,
              paciente: pt.nombre_paciente,
              monto: pt.monto,
              forma_pago: pt.formaPago?.forma_pago || 'Desconocido'
          })),
          lista_recepcion: pagosRecepcion.map(pr => ({
              id: pr.id,
              paciente: `${pr.paciente?.paterno || ''} ${pr.paciente?.materno || ''} ${pr.paciente?.nombre || ''}`.trim(),
              monto: pr.monto,
              forma_pago: pr.formaPagoRel?.forma_pago || 'Desconocido'
          })),
          totales: {
              tablet: Object.values(tabletAgg).reduce((a: number, b: number) => a + b, 0),
              recepcion: Object.values(recepcionAgg).reduce((a: number, b: number) => a + b, 0)
          }
      };
  }
}
