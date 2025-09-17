import type { Request } from 'express';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  tenantId: string;
  iat?: number; // Issued at (JWT service will set this)
  exp?: number; // Expiration (JWT service will set this)
  type: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  passwordHash: string;
  status: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  bcryptRounds: number;
}

export interface LoginAttempt {
  email: string;
  tenantId?: string;
  ip: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  errorReason?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
  };
}
