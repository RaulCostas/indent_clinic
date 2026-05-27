import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import sharp = require('sharp');

@Injectable()
export class SupabaseStorageService {
  private supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseStorageService.name);

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

    if (!url || !key) {
      this.logger.error('SUPABASE_URL or SUPABASE_KEY is not defined in environment variables');
    } else {
      this.supabase = createClient(url, key);
    }
  }

  isConfigured(): boolean {
    return !!this.supabase;
  }

  private sanitizePath(path: string): string {
    return path
      .toLowerCase()
      .replace(/\s+/g, '-')           // Reemplaza espacios con guiones
      .replace(/[^a-z0-9\-\/\.]/g, '') // Elimina caracteres no permitidos
      .replace(/-+/g, '-')            // Evita guiones múltiples
      .trim();
  }

  async uploadFile(bucket: string, fullPath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    let cleanPath = this.sanitizePath(fullPath);
    let targetBuffer = fileBuffer;
    let targetContentType = contentType;

    // Compress image to webp
    if (/^image\/(png|jpeg|jpg|webp)$/i.test(contentType) || /\.(png|jpe?g|webp)$/i.test(cleanPath)) {
      try {
        targetBuffer = await sharp(fileBuffer)
          .webp({ quality: 80 })
          .toBuffer();
        
        cleanPath = cleanPath.replace(/\.(png|jpe?g)$/i, '.webp');
        targetContentType = 'image/webp';
      } catch (error) {
        this.logger.error(`Error compressing image: ${error.message}`);
      }
    }

    const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON/OTHER';
    this.logger.log(`[SupabaseStorageService] Uploading to ${bucket}/${cleanPath} (Key Type: ${keyType})...`);
    
    if (!this.supabase) {
      this.logger.error('[SupabaseStorageService] Supabase client is not initialized!');
      throw new Error('Supabase client not initialized. Check SUPABASE_URL and SUPABASE_KEY.');
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(cleanPath, targetBuffer, { contentType: targetContentType, upsert: true });

    if (error) {
      this.logger.error(`Error uploading to Supabase (${bucket}/${cleanPath}): ${error.message}`);
      this.logger.warn('[SupabaseStorageService] Error details:', JSON.stringify(error, null, 2));
      
      if ((error as any).status === 404 || error.message.includes('not found')) {
          this.logger.error(`[SupabaseStorageService] BUCKET "${bucket}" NOT FOUND! Ensure it exists in Supabase.`);
      }
      
      if ((error as any).status === 403 || error.message.includes('permission')) {
          this.logger.error(`[SupabaseStorageService] PERMISSION DENIED! Ensure you are using the SERVICE_ROLE_KEY or bucket policies allow uploads.`);
      }

      throw error;
    }

    const { data: { publicUrl } } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(cleanPath);

    this.logger.log(`[SupabaseStorageService] Upload successful. Public URL: ${publicUrl}`);
    return publicUrl;
  }

  async uploadBase64(bucket: string, fullPath: string, base64String: string): Promise<string> {
    const match = base64String.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      if (base64String.startsWith('http')) return base64String;
      throw new Error('Invalid Base64 string format');
    }

    const extension = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const contentType = `image/${extension}`;
    
    let fileName = fullPath;
    if (!fileName.endsWith(`.${extension}`)) {
      fileName = `${fullPath}-${Date.now()}.${extension}`;
    }

    return this.uploadFile(bucket, fileName, buffer, contentType);
  }

  async deleteFile(bucket: string, path: string): Promise<void> {
    const relativePath = path.split(`${bucket}/`).pop();
    if (!relativePath) return;

    const { error } = await this.supabase.storage.from(bucket).remove([relativePath]);
    if (error) {
      this.logger.error(`Error deleting from Supabase: ${error.message}`);
    }
  }

  async downloadAsBase64(bucket: string, path: string): Promise<string> {
    let relativePath = path;
    
    if (path.startsWith('http')) {
        try {
            // Extraer la parte del path después del nombre del bucket
            // URL: https://.../object/public/bucket-name/folder/file.png
            const url = new URL(path);
            const pathParts = url.pathname.split(`/${bucket}/`);
            if (pathParts.length > 1) {
                relativePath = pathParts[pathParts.length - 1];
            } else {
                // Fallback si la estructura es diferente
                relativePath = path.split(`${bucket}/`).pop() || path;
            }
        } catch (e) {
            relativePath = path.split(`${bucket}/`).pop() || path;
        }
    } else {
        relativePath = (path.includes(bucket) ? path.split(`${bucket}/`).pop() : path) || path;
    }

    this.logger.log(`[SupabaseStorageService] Downloading from bucket "${bucket}" with path "${relativePath}"`);
    
    const { data, error } = await this.supabase.storage.from(bucket).download(relativePath);
    
    if (error) {
      this.logger.error(`Error downloading from Supabase (${bucket}/${relativePath}): ${error.message}`);
      throw error;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const contentType = data.type || 'image/png';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  }
}
