import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuditLogServiceModule } from './audit-log-service.module';

async function bootstrap() {
  const logger = new Logger('AuditLogService');
  const app = await NestFactory.create(AuditLogServiceModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get('AUDIT_LOG_SERVICE_PORT', 3300);

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
    .setTitle('Audit Log Service')
    .setDescription('Audit logging and monitoring service for RBAC system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`Audit Log Service running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
}
bootstrap();
