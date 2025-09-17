import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AuthServiceModule } from './auth-service.module';

async function bootstrap() {
  const logger = new Logger('AuthService');
  const app = await NestFactory.create(AuthServiceModule);
  
  const configService = app.get(ConfigService);
  const port = configService.get('AUTH_SERVICE_PORT', 3200);

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
    .setTitle('Authentication Service')
    .setDescription('JWT-based authentication and authorization service')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`Auth Service running on port ${port}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
}
bootstrap();
