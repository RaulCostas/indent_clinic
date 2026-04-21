import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CubetasService } from './cubetas.service';
import { CubetasController } from './cubetas.controller';
import { Cubeta } from './entities/cubeta.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Cubeta])],
    controllers: [CubetasController],
    providers: [CubetasService],
    exports: [CubetasService],
})
export class CubetasModule { }
