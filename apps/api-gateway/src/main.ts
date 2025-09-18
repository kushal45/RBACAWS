import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import * as helmet from 'helmet';

import { EnterpriseLoggerService } from '../../../libs/common/src';

import { ApiGatewayModule } from './api-gateway.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(ApiGatewayModule);
  const configService = app.get(ConfigService);
  const logger = app.get(EnterpriseLoggerService);
  logger.setContext('ApiGateway');

  const port = configService.get<number>('API_GATEWAY_PORT', 3000);

  // Security middleware
  app.use(helmet.default());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('RBAC API Gateway')
    .setDescription('Multi-tenant RBAC system API Gateway')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-tenant-id', in: 'header' }, 'tenant-id')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
}

bootstrap().catch(error => {
  // eslint-disable-next-line no-console
  console.error('Failed to start API Gateway:', error);
  process.exit(1);
});
