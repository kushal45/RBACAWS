import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AuthServiceModule } from './auth-service.module';

/**
 * Validates that all required environment variables are present
 * Throws an error if any required variable is missing
 */
function validateRequiredEnvironmentVariables(): void {
  const requiredEnvVars = ['JWT_SECRET'];
  const missingVars: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Please set these variables before starting the auth service.',
    );
  }
}

async function bootstrap(): Promise<void> {
  const logger = new Logger('AuthService');

  // Validate required environment variables before starting the application
  validateRequiredEnvironmentVariables();

  const app = await NestFactory.create(AuthServiceModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('AUTH_SERVICE_PORT', 3200);

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

void bootstrap();
