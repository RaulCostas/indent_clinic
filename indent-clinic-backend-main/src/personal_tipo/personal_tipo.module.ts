import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalTipoService } from './personal_tipo.service';
import { PersonalTipoController } from './personal_tipo.controller';
import { PersonalTipo } from './entities/personal_tipo.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PersonalTipo])],
    controllers: [PersonalTipoController],
    providers: [PersonalTipoService],
    exports: [PersonalTipoService],
})
export class PersonalTipoModule { }
