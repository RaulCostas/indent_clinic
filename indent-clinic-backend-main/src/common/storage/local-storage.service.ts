import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;

  constructor() {
    // Priority: /data (Render Persistent Disk) -> uploads (local)
    if (fs.existsSync('/data') && process.platform !== 'win32') {
      this.uploadDir = '/data';
      this.logger.log(`[LocalStorageService] Using persistent disk at ${this.uploadDir}`);
    } else {
      this.uploadDir = path.join(process.cwd(), 'uploads');
      this.logger.log(`[LocalStorageService] Using local directory at ${this.uploadDir}`);
    }

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private sanitizePath(filePath: string): string {
    return filePath
      .replace(/\\/g, '/') // Normalizar separadores
      .split('/')
      .map(part => part.replace(/[^a-z0-9\-\.\_]/gi, '_')) // Reemplazar caracteres especiales con guion bajo
      .join('/');
  }

  async uploadFile(bucket: string, fullPath: string, fileBuffer: Buffer): Promise<string> {
    const cleanPath = this.sanitizePath(fullPath);
    const targetPath = path.join(this.uploadDir, bucket, cleanPath);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.writeFileSync(targetPath, fileBuffer);

    // Return the relative URL to be served by the backend
    const port = process.env.PORT || 3000;
    const baseUrl = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
    return `${baseUrl}/uploads/${bucket}/${cleanPath}`;
  }

  async deleteFile(bucket: string, fileUrl: string): Promise<void> {
    try {
      const urlPart = `/uploads/${bucket}/`;
      const relativePath = fileUrl.split(urlPart).pop();
      if (!relativePath) return;

      const targetPath = path.join(this.uploadDir, bucket, relativePath);
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    } catch (error) {
      this.logger.error(`Error deleting local file: ${error.message}`);
    }
  }

  async uploadBase64(bucket: string, fullPath: string, base64String: string): Promise<string> {
    const match = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      if (base64String.startsWith('http')) return base64String;
      throw new Error('Invalid Base64 string format');
    }

    const extension = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    
    let fileName = fullPath;
    if (!fileName.endsWith(`.${extension}`)) {
      fileName = `${fullPath}-${Date.now()}.${extension}`;
    }

    return this.uploadFile(bucket, fileName, buffer);
  }

  async downloadAsBase64(bucket: string, fileUrl: string): Promise<string> {
    try {
      const urlPart = `/uploads/${bucket}/`;
      const relativePath = fileUrl.split(urlPart).pop();
      if (!relativePath) throw new Error('Invalid local file URL');

      const targetPath = path.join(this.uploadDir, bucket, relativePath);
      if (!fs.existsSync(targetPath)) throw new Error('File not found');

      const buffer = fs.readFileSync(targetPath);
      const extension = path.extname(targetPath).substring(1) || 'png';
      const contentType = `image/${extension}`;
      
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.logger.error(`Error downloading local file as base64: ${error.message}`);
      throw error;
    }
  }
}
