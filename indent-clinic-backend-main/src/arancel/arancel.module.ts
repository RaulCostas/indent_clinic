import { Module } from '@nestjs/common'; // Rebuild
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArancelService } from './arancel.service';
import { ArancelController } from './arancel.controller';
import { Arancel } from './entities/arancel.entity';
import { EspecialidadModule } from '../especialidad/especialidad.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Arancel]),
        EspecialidadModule,
    ],
    controllers: [ArancelController],
    providers: [ArancelService],
})
export class ArancelModule { }
