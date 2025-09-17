import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import {
  LoginRequestDto,
  LoginResponseDto,
  LogoutRequestDto,
  LogoutResponseDto,
  RefreshTokenRequestDto,
  ValidateTokenRequestDto,
  ValidateTokenResponseDto,
} from './dto/auth.dto';
import { AuthenticatedUser, LoginAttempt } from './interfaces/auth.interface';
import { JwtAuthService } from './services/jwt-auth.service';

@Injectable()
export class AuthServiceService {
  private readonly blacklistedTokens = new Set<string>(); // In production, use Redis
  private readonly loginAttempts = new Map<string, LoginAttempt[]>(); // In production, use database

  constructor(private readonly jwtAuthService: JwtAuthService) {}

  /**
   * Authenticate user and return JWT tokens
   */
  async login(loginDto: LoginRequestDto, ip: string, userAgent: string): Promise<LoginResponseDto> {
    const { email, password, tenantId } = loginDto;

    // Check for too many failed attempts
    this.checkRateLimit(email, ip);

    try {
      // In production, fetch user from database
      const user = await this.findUserByEmailAndTenant(email, tenantId);

      if (!user) {
        this.recordFailedAttempt(email, ip, userAgent, 'User not found');
        throw new UnauthorizedException('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await this.jwtAuthService.verifyPassword(password, user.passwordHash);

      if (!isPasswordValid) {
        this.recordFailedAttempt(email, ip, userAgent, 'Invalid password');
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check user status
      if (user.status !== 'active') {
        this.recordFailedAttempt(email, ip, userAgent, 'User inactive');
        throw new UnauthorizedException('Account is not active');
      }

      // Generate tokens
      const tokens = await this.jwtAuthService.generateTokenPair(user);

      // Record successful attempt
      this.recordSuccessfulAttempt(email, ip, userAgent);

      // Update last login (in production, update database)
      user.lastLoginAt = new Date();

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          tenantId: user.tenantId,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.recordFailedAttempt(email, ip, userAgent, 'Internal error');
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshDto: RefreshTokenRequestDto): Promise<LoginResponseDto> {
    const { refreshToken } = refreshDto;

    if (this.blacklistedTokens.has(refreshToken)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    try {
      const tokens = await this.jwtAuthService.refreshToken(refreshToken);
      const payload = this.jwtAuthService.decodeToken(tokens.accessToken);

      if (!payload) {
        throw new UnauthorizedException('Invalid token payload');
      }

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer',
        user: {
          id: payload.sub,
          email: payload.email,
          tenantId: payload.tenantId,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(validateDto: ValidateTokenRequestDto): Promise<ValidateTokenResponseDto> {
    const { token } = validateDto;

    if (this.blacklistedTokens.has(token)) {
      return {
        valid: false,
        error: 'Token has been revoked',
      };
    }

    try {
      const payload = await this.jwtAuthService.validateToken(token);

      return {
        valid: true,
        user: {
          id: payload.sub,
          email: payload.email,
          tenantId: payload.tenantId,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }

  /**
   * Logout user and blacklist token
   */
  logout(logoutDto: LogoutRequestDto): LogoutResponseDto {
    const { token } = logoutDto;

    // Add token to blacklist
    this.blacklistedTokens.add(token);

    // In production, store blacklisted tokens in Redis with TTL

    return {
      message: 'Successfully logged out',
    };
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Validate new password strength
    const validation = this.jwtAuthService.validatePasswordStrength(newPassword);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Password does not meet requirements',
        errors: validation.errors,
      });
    }

    // In production, fetch user from database
    const user = await this.findUserById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.jwtAuthService.verifyPassword(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await this.jwtAuthService.hashPassword(newPassword);

    // Update password (in production, update database)
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date();

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Mock user finder - replace with actual database query
   */
  private async findUserByEmailAndTenant(
    email: string,
    tenantId?: string,
  ): Promise<AuthenticatedUser | null> {
    // This is a mock implementation
    // In production, query your database
    if (email === 'john.doe@acme.com' && tenantId === 'tenant-123') {
      return {
        id: 'user-789',
        email: 'john.doe@acme.com',
        tenantId: 'tenant-123',
        passwordHash: await this.jwtAuthService.hashPassword('SecurePassword123!'),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }

  /**
   * Mock user finder by ID - replace with actual database query
   */
  private async findUserById(userId: string): Promise<AuthenticatedUser | null> {
    // This is a mock implementation
    if (userId === 'user-789') {
      return {
        id: 'user-789',
        email: 'john.doe@acme.com',
        tenantId: 'tenant-123',
        passwordHash: await this.jwtAuthService.hashPassword('SecurePassword123!'),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
    return null;
  }

  /**
   * Check rate limiting for login attempts
   */
  private checkRateLimit(email: string, ip: string): void {
    const key = `${email}:${ip}`;
    const attempts = this.loginAttempts.get(key) ?? [];
    const recentAttempts = attempts.filter(
      attempt => Date.now() - attempt.timestamp.getTime() < 15 * 60 * 1000, // 15 minutes
    );

    if (recentAttempts.length >= 5) {
      throw new BadRequestException('Too many failed login attempts. Please try again later.');
    }
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(email: string, ip: string, userAgent: string, reason: string): void {
    const key = `${email}:${ip}`;
    const attempts = this.loginAttempts.get(key) ?? [];

    attempts.push({
      email,
      ip,
      userAgent,
      success: false,
      timestamp: new Date(),
      errorReason: reason,
    });

    this.loginAttempts.set(key, attempts);
  }

  /**
   * Record successful login attempt
   */
  private recordSuccessfulAttempt(email: string, ip: string, userAgent: string): void {
    const key = `${email}:${ip}`;
    const attempts = this.loginAttempts.get(key) ?? [];

    attempts.push({
      email,
      ip,
      userAgent,
      success: true,
      timestamp: new Date(),
    });

    this.loginAttempts.set(key, attempts);
  }
}
