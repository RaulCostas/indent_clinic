import { Injectable, NotFoundException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { SupabaseStorageService } from '../common/storage/supabase-storage.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private readonly storageService: SupabaseStorageService,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    await this.checkDuplicate(createUserDto);

    if (createUserDto.foto && createUserDto.foto.startsWith('data:image')) {
      this.logger.warn(`[UsersService] Detected Base64 photo for new user: ${createUserDto.email}, attempting upload...`);
      createUserDto.foto = await this.storageService.uploadBase64('clinica-media', `user-photo-${createUserDto.email}`, createUserDto.foto);
      this.logger.warn(`[UsersService] Photo uploaded successfully: ${createUserDto.foto}`);
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: { name: 'ASC' }
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ email });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    console.log(`[UsersService] Updating user ${id} with data:`, { ...updateUserDto, foto: updateUserDto.foto ? 'Present (DataURL truncated)' : 'Not present' });
    await this.checkDuplicate(updateUserDto, id);
    const user = await this.findOne(id);

    if (updateUserDto.foto && updateUserDto.foto.startsWith('data:image')) {
      this.logger.warn(`[UsersService] Detected new Base64 photo for user ${id}, attempting upload...`);
      // Delete old photo
      if (user.foto && user.foto.startsWith('http')) {
        await this.storageService.deleteFile('clinica-media', user.foto);
      }
      updateUserDto.foto = await this.storageService.uploadBase64('clinica-media', `user-photo-${id}`, updateUserDto.foto);
      this.logger.warn(`[UsersService] Photo updated successfully: ${updateUserDto.foto}`);
    }

    if (updateUserDto.password) {
      const salt = await bcrypt.genSalt();
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, salt);
    }
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }


  async changePassword(id: number, currentPassword: string, newPassword: string, confirmPassword: string): Promise<void> {
    // Verificar que las contraseñas nuevas coincidan
    if (newPassword !== confirmPassword) {
      throw new ConflictException('Las contraseñas no coinciden');
    }

    // Obtener el usuario
    const user = await this.findOne(id);

    // Verificar que la contraseña actual sea correcta
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ConflictException('La contraseña actual es incorrecta');
    }

    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Actualizar la contraseña
    user.password = hashedPassword;
    await this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  private async checkDuplicate(dto: Partial<User>, id?: number) {
    const { email, name } = dto;

    if (email) {
      const query = this.usersRepository.createQueryBuilder('user')
        .where('TRIM(LOWER(user.email)) = :email', { email: email.trim().toLowerCase() });
      if (id) query.andWhere('user.id != :id', { id });
      const exists = await query.getOne();
      if (exists) throw new BadRequestException(['El correo electrónico ya está registrado por otro usuario']);
    }

    if (name) {
      const query = this.usersRepository.createQueryBuilder('user')
        .where('TRIM(LOWER(user.name)) = :name', { name: name.trim().toLowerCase() });
      if (id) query.andWhere('user.id != :id', { id });
      const exists = await query.getOne();
      if (exists) throw new BadRequestException(['Ya existe un usuario con este nombre']);
    }
  }
}
