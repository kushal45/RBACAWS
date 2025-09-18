import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  AuthCredential,
  AuthToken,
  User,
  getDatabaseConfig,
  LoggingModule,
} from '../../../libs/common/src';

import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { AuthCredentialRepository, AuthTokenRepository, UserRepository } from './repositories';
import { JwtAuthService } from './services/jwt-auth.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule.forRoot('auth-service'),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    }),
    TypeOrmModule.forFeature([User, AuthCredential, AuthToken]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
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
