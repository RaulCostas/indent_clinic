import { Global, Module } from '@nestjs/common';
import { SupabaseStorageService } from './supabase-storage.service';
import { LocalStorageService } from './local-storage.service';

@Global()
@Module({
  providers: [SupabaseStorageService, LocalStorageService],
  exports: [SupabaseStorageService, LocalStorageService],
})
export class StorageModule {}
