import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { TimeoutInterceptor } from './timeout.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TimeoutInterceptor(30_000));

  // Serve uploaded files as static assets
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads' });

  const server = await app.listen(3001, '0.0.0.0');

  // Keep-alive timeout must be greater than nginx upstream keepalive_timeout
  // to prevent "connection reset" errors (default Node.js is only 5s)
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}

bootstrap();
