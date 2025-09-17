import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthCredential, AuthToken, User } from '../../../libs/common/src';

import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { AuthCredentialRepository, AuthTokenRepository, UserRepository } from './repositories';
import { JwtAuthService } from './services/jwt-auth.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AuthCredential, AuthToken]),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'test-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthServiceController],
  providers: [
    AuthServiceService,
    JwtAuthService,
    AuthCredentialRepository,
    AuthTokenRepository,
    UserRepository,
  ],
  exports: [AuthServiceService, AuthCredentialRepository, AuthTokenRepository, UserRepository],
})
export class AuthServiceModule {}
