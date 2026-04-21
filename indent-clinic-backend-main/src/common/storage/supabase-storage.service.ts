import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

  private sanitizePath(path: string): string {
    return path
      .toLowerCase()
      .replace(/\s+/g, '-')           // Reemplaza espacios con guiones
      .replace(/[^a-z0-9\-\/\.]/g, '') // Elimina caracteres no permitidos
      .replace(/-+/g, '-')            // Evita guiones múltiples
      .trim();
  }

  async uploadFile(bucket: string, fullPath: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    const cleanPath = this.sanitizePath(fullPath);
    this.logger.log(`[SupabaseStorageService] Uploading to ${bucket}/${cleanPath}...`);
    
    if (!this.supabase) {
      this.logger.error('[SupabaseStorageService] Supabase client is not initialized!');
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(cleanPath, fileBuffer, { contentType, upsert: true });

    if (error) {
      this.logger.error(`Error uploading to Supabase (${bucket}/${cleanPath}): ${error.message}`);
      this.logger.warn('[SupabaseStorageService] Error details:', JSON.stringify(error, null, 2));
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
}
