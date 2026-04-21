import { IsString, IsEmail, IsOptional, IsArray } from 'class-validator';

export class CreateUserDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsOptional()
    password: string;

    @IsString()
    estado: string;

    @IsString()
    @IsOptional()
    foto?: string;


    @IsArray()
    @IsOptional()
    permisos?: string[];
}

