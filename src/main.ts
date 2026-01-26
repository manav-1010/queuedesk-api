import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = app.get(ConfigService);
  const prefix = config.get<string>('API_PREFIX') ?? '/api';

  // Keep all API routes under /api (clean separation from /health and /docs)
  app.setGlobalPrefix(prefix, { exclude: ['health', 'docs'] });

  // Basic security headers. Not a silver bullet, but a good default for public APIs.
  app.use(helmet());

  // Response compression for better performance (especially helpful once payloads grow)
  app.use(compression());

  // Simple rate limit to slow down brute-force / spammy requests.
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.enableCors({ origin: true });

  // Strict input validation so we fail fast and don’t let junk data reach the DB layer.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger is for local/dev + demo. In production, we can keep it but lock it down if needed.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('QueueDesk API')
    .setDescription(
      'QueueDesk — Service Request Portal API built with NestJS + TypeScript + PostgreSQL + Prisma',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const doc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, doc);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}${prefix}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger at http://localhost:${port}/docs`);
}

bootstrap();
