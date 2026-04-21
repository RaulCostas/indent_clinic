import { Controller, Get, Post, Delete, Param, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/create-backup.dto';

@Controller('backup')
export class BackupController {
    constructor(private readonly backupService: BackupService) { }

    @Post('create')
    async createBackup(@Body() createBackupDto: CreateBackupDto) {
        return await this.backupService.createBackup(createBackupDto);
    }

    @Get('list')
    async listBackups() {
        return await this.backupService.listBackups();
    }

    @Get('download/:filename')
    async downloadBackup(@Param('filename') filename: string, @Res() res: any) {
        const backupInfo = await this.backupService.getBackupInfo(filename);
        res.download(backupInfo.path, filename);
    }

    @Post('restore/:filename')
    async restoreBackup(@Param('filename') filename: string) {
        return await this.backupService.restoreBackup(filename);
    }

    @Delete(':filename')
    async deleteBackup(@Param('filename') filename: string) {
        return await this.backupService.deleteBackup(filename);
    }
}
