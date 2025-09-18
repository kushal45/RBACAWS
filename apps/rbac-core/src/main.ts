import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import 'reflect-metadata';

import { RbacCoreModule } from './rbac-core.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('RbacCore');
  const app = await NestFactory.create(RbacCoreModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('RBAC_CORE_PORT', 3100);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RBAC Core Service')
    .setDescription('Core RBAC functionality - tenant, user, role and policy management')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`RBAC Core Service running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
}

void bootstrap();
