import { IsString, IsNotEmpty } from 'class-validator';

export class VerifyFirmaDto {
    @IsString()
    @IsNotEmpty()
    hashDocumento: string;
}
