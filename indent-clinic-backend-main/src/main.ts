import 'dotenv/config'; // Cargar variables de entorno
import * as fs from 'fs';
import { NestFactory } from '@nestjs/core'; // Force Rebuild 3
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import compression = require('compression');
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Serve static files from persistent disk if available, otherwise local uploads
  const uploadDir = (fs.existsSync('/data') && process.platform !== 'win32') 
    ? '/data' 
    : join(process.cwd(), 'uploads');
    
  console.log(`[Main] Serving static assets from: ${uploadDir}`);
  app.useStaticAssets(uploadDir, {
    prefix: '/uploads/',
  });

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.use(compression());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log('Force Migration Trigger: ' + new Date().toISOString());
}
bootstrap();
