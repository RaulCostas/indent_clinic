import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { CreateLaboratorioDto } from './dto/create-laboratorio.dto';
import { UpdateLaboratorioDto } from './dto/update-laboratorio.dto';
import { Laboratorio } from './entities/laboratorio.entity';

const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

@Injectable()
export class LaboratoriosService {
    constructor(
        @InjectRepository(Laboratorio)
        private laboratoriosRepository: Repository<Laboratorio>,
    ) { }

    async create(createLaboratorioDto: CreateLaboratorioDto) {
        const inputStr = createLaboratorioDto.laboratorio.trim();
        const normalizedInput = normalizeString(inputStr);

        const allRecords = await this.laboratoriosRepository.find();
        const existing = allRecords.find(r => normalizeString(r.laboratorio) === normalizedInput);

        if (existing) {
            throw new BadRequestException('El laboratorio ya existe');
        }

        createLaboratorioDto.laboratorio = inputStr;
        return this.laboratoriosRepository.save(createLaboratorioDto);
    }

    async findAll(page: number = 1, limit: number = 10, search?: string) {
        const skip = (page - 1) * limit;
        const where = search ? { laboratorio: ILike(`%${search}%`) } : {};

        const [data, total] = await this.laboratoriosRepository.findAndCount({
            where,
            skip,
            take: limit,
            order: { laboratorio: 'ASC' },
        });

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    findOne(id: number) {
        return this.laboratoriosRepository.findOneBy({ id });
    }

    async update(id: number, updateLaboratorioDto: UpdateLaboratorioDto) {
        if (updateLaboratorioDto.laboratorio) {
            const inputStr = updateLaboratorioDto.laboratorio.trim();
            const normalizedInput = normalizeString(inputStr);

            const allRecords = await this.laboratoriosRepository.find();
            const existing = allRecords.find(r => normalizeString(r.laboratorio) === normalizedInput);

            if (existing && existing.id !== id) {
                throw new BadRequestException('El laboratorio ya existe');
            }
            updateLaboratorioDto.laboratorio = inputStr;
        }
        return this.laboratoriosRepository.update(id, updateLaboratorioDto);
    }

    remove(id: number) {
        return this.laboratoriosRepository.delete(id);
    }

    async seed() {
        const data = [
            { id: 1, laboratorio: "DENTAL CORTEZ/ MARTIN MIGUEL CORTEZ NIETO", celular: "70669074", telefono: "2790379 - 2792276 - 2230302", direccion: "CALLE 12 ACHUMANI # 7 ENTRE AV. THE STRONGEST Y QUENALLATA", email: "martinmcortez@gmail.com", banco: "1500-8599-34 BNB", numero_cuenta: "", estado: "activo" },
            { id: 2, laboratorio: "LABORATORIO VANIA COLUMBA", celular: " ", telefono: "76200151", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 3, laboratorio: "CAD/ CAM", celular: " 77435555", telefono: "Teléfono 2916312", direccion: "Av. Hernando Siles, Nro. 5593, esq. Calle 10, Edificio Tunupa. Planta Baja. ", email: "marceloviscarra@labcadcam.com", banco: "1502103608", numero_cuenta: "", estado: "activo" },
            { id: 4, laboratorio: "DENTAL 10/ RODMY E. GUIBARRA MITA", celular: "67307778", telefono: " ", direccion: " ", email: "rodmy@hotmai.com", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 5, laboratorio: "LABORATORIO ARTUNDENT/ROBERTO ARTUNDUAGA", celular: "60674670", telefono: "67102737", direccion: " ", email: " ", banco: "BNB 1501-9768-53", numero_cuenta: "", estado: "activo" },
            { id: 6, laboratorio: "TECNICO MARIBEL", celular: " ", telefono: "77550704", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 7, laboratorio: "TECNICO JOSE MARIA", celular: "77202832", telefono: "77215115", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 8, laboratorio: "MERCO DENT/SUSANA MERLO", celular: "70688166", telefono: " ", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 9, laboratorio: "DRA. PAMELA AYOROA", celular: " ", telefono: " ", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 10, laboratorio: "LABORATORIO OROPEZA", celular: " ", telefono: "72013352", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 11, laboratorio: "DENTEX S.R.L.", celular: " ", telefono: "2772085", direccion: "CALACOTO C/21 # 826 OF 2", email: "info@dentex.com.bo", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 12, laboratorio: "LABORATORIO ARTIEDA", celular: "77530642", telefono: "2775733", direccion: "CALLE 10 CALACOTO ESQ. LOS MANZANOS", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 13, laboratorio: "LABORATORIO MALDONADO", celular: " ", telefono: "76536206", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 14, laboratorio: "LABORATORIO ANTEQUERA", celular: " ", telefono: " ", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 15, laboratorio: "LABORATORIO DENTAL CLASICO NANO", celular: " ", telefono: " ", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 16, laboratorio: "LABORATORIO ALDAHIR OSSIO", celular: " ", telefono: " ", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 17, laboratorio: "LABORATORIO XAVIER ZAMURIANO", celular: " ", telefono: " ", direccion: "SUCRE", email: " ", banco: "BISA  8324-9401-1", numero_cuenta: "", estado: "activo" },
            { id: 18, laboratorio: "LABORATORIO DENTAL PABLO LEMA", celular: " ", telefono: " ", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 19, laboratorio: "LABORATORIO DENTAL MIA/CELESTE GUZMAN", celular: "68105536", telefono: "220498", direccion: " ", email: " ", banco: " MERCANTIL 4062156496", numero_cuenta: "", estado: "activo" },
            { id: 20, "laboratorio": "ANDREA VILLEGAS", "celular": " ", "telefono": " ", "direccion": "CALACOTO CALLE 10 ESQ. LOS MANZANOS", "email": " ", "banco": " ", "numero_cuenta": "", "estado": "activo" },
            { id: 21, laboratorio: "GALINDO DENTAL", celular: "79666683", telefono: "2791092  - 2771892", direccion: "CALACOTO C/18 RENE MORENO # 1071 BLOQUE K-22", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 22, laboratorio: "RODOLFO GUIBARRA", celular: "71941078", telefono: "2432145", direccion: "SOPOCACHI", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 23, laboratorio: "BOLIVIA DENT/ RAUL SIÑANI", celular: "70680428", telefono: "2221041", direccion: "EDIF.VENECIA OF.1 PLANTA BAJA AV.CAPITAN RAVELO 2351 ESQ.B.SALINAS SUCURSAL G.GUERRA 1839 ESQ.LUCAS JAIMES DETRAS HOSP.OBRERO", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 24, laboratorio: "LAB. DENTAL BREDENT/JAVIER CONDORI", celular: "70648222", telefono: "2913808", direccion: "PASAJE FLORIDA #10 MIRAFLORES ENTRE DIAZ ROMERO Y SAAVEDRA", email: "javier70648@hotmail.com", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 25, laboratorio: "SOCIMO MARCA", celular: " ", telefono: "73214383", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 26, laboratorio: "GONZALO SUXO", celular: "79584252", telefono: "2486851", direccion: "CALLE OTERO DE LA VEGA #644 SAN PEDRO", email: " ", banco: ".", numero_cuenta: "", estado: "activo" },
            { id: 27, laboratorio: "LABORATORIO ARTDENT/ GROVER FERNANDEZ", celular: "69743251", telefono: "69743251", direccion: " ", email: " ", banco: ".", numero_cuenta: "", estado: "activo" }
        ];

        for (const item of data) {
            await this.laboratoriosRepository.save(item);
        }

        return { message: 'Seed data inserted successfully', count: data.length };
    }
}
