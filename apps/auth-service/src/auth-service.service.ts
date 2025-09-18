import { randomBytes } from 'crypto';

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { AuthStatus, TokenType, UserStatus, UserType } from '../../../libs/common/src';

import {
  LoginRequestDto,
  LoginResponseDto,
  LogoutRequestDto,
  LogoutResponseDto,
  RefreshTokenRequestDto,
  UserRegistrationRequestDto,
  UserRegistrationResponseDto,
  ValidateTokenRequestDto,
  ValidateTokenResponseDto,
} from './dto/auth.dto';
import { AuthenticatedUser, LoginAttempt } from './interfaces/auth.interface';
import { AuthCredentialRepository, AuthTokenRepository, UserRepository } from './repositories';
import { JwtAuthService } from './services/jwt-auth.service';

@Injectable()
export class AuthServiceService {
  private readonly blacklistedTokens = new Set<string>(); // In production, use Redis
  private readonly loginAttempts = new Map<string, LoginAttempt[]>(); // In production, use database

  constructor(
    private readonly jwtAuthService: JwtAuthService,
    private readonly userRepository: UserRepository,
    private readonly authCredentialRepository: AuthCredentialRepository,
    private readonly authTokenRepository: AuthTokenRepository,
  ) {}

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

      // Check user status (allow active and pending_invitation for login)
      if (user.status !== 'active' && user.status !== 'pending_invitation') {
        this.recordFailedAttempt(email, ip, userAgent, 'User inactive');
        throw new UnauthorizedException('Account is not active');
      }

      // Generate tokens
      const tokens = await this.jwtAuthService.generateTokenPair(user);

      // Record successful attempt
      this.recordSuccessfulAttempt(email, ip, userAgent);

      // Update last login (in production, update database)
      user.lastLoginAt = new Date();

      // Update auth credential login tracking
      await this.authCredentialRepository.updateLastLogin(user.id);

      // Store refresh token in database
      const refreshTokenHash = await this.jwtAuthService.hashPassword(tokens.refreshToken);
      await this.authTokenRepository.createToken({
        userId: user.id,
        tokenType: TokenType.REFRESH,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: { loginIp: ip, userAgent },
      });

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
   * Find user by email and tenant from database
   */
  private async findUserByEmailAndTenant(
    email: string,
    tenantId?: string,
  ): Promise<AuthenticatedUser | null> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        return null;
      }

      // Check tenant match for non-system admins
      if (user.userType !== UserType.SYSTEM_ADMIN) {
        // For non-system admins, both user.tenantId and tenantId must match exactly
        if (user.tenantId !== tenantId) {
          return null;
        }
      } else {
        // For system admins, tenantId should be null/undefined and login tenantId should also be null/undefined
        if (tenantId) {
          return null; // System admins shouldn't provide a tenantId
        }
      }

      // Get auth credentials
      const authCredential = await this.authCredentialRepository.findByUserId(user.id);

      if (!authCredential) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        passwordHash: authCredential.passwordHash,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error finding user:', error);
      return null;
    }
  }

  /**
   * Find user by ID from database
   */
  private async findUserById(userId: string): Promise<AuthenticatedUser | null> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return null;
      }

      const authCredential = await this.authCredentialRepository.findByUserId(user.id);
      if (!authCredential) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        passwordHash: authCredential.passwordHash,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error finding user by ID:', error);
      return null;
    }
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

  /**
   * Register a new user with specified type
   */
  async registerUser(
    registrationDto: UserRegistrationRequestDto,
  ): Promise<UserRegistrationResponseDto> {
    const { email, password, firstName, lastName, userType, tenantId } = registrationDto;

    // Determine user type (default to regular user)
    const finalUserType = userType ?? UserType.REGULAR_USER;

    // For system admins, tenantId should be null
    if (finalUserType === UserType.SYSTEM_ADMIN && tenantId) {
      throw new BadRequestException('System admins cannot be assigned to a tenant');
    }

    // For non-system users, tenantId is required
    if (finalUserType !== UserType.SYSTEM_ADMIN && !tenantId) {
      throw new BadRequestException('tenantId is required for non-system admin users');
    }

    try {
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user profile
      const profile = {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
      };

      // Create user entity
      const savedUser = await this.userRepository.createUser({
        email,
        userType: finalUserType,
        tenantId: finalUserType === UserType.SYSTEM_ADMIN ? undefined : tenantId,
        profile,
        status: UserStatus.PENDING_INVITATION, // All users start as pending invitation
      });

      // Create auth credential
      await this.authCredentialRepository.createCredential({
        userId: savedUser.id,
        email,
        passwordHash,
        status: AuthStatus.PENDING, // All auth credentials start as pending
      });

      // For non-system users, create an activation token
      if (finalUserType !== UserType.SYSTEM_ADMIN) {
        const activationToken = randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(activationToken, 12);

        await this.authTokenRepository.createToken({
          userId: savedUser.id,
          tokenType: TokenType.ACTIVATION,
          tokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          metadata: { purpose: 'account_activation' },
        });
      }

      return {
        message: 'User registered successfully',
        userId: savedUser.id,
        email: savedUser.email,
        userType: savedUser.userType,
        tenantId: savedUser.tenantId || undefined, // Convert null to undefined
      };
    } catch (error) {
      // Handle database unique constraint violations for email
      if (error instanceof Error) {
        const errorMessage = error.message;

        // Check for PostgreSQL unique constraint violation
        if (
          errorMessage.includes('duplicate key value') &&
          errorMessage.includes('unique constraint')
        ) {
          // Check if it's the email constraint by checking the constraint name
          // The email unique constraint has this specific name
          if (errorMessage.includes('UQ_64358e9de820068515ed2e14a36')) {
            throw new BadRequestException('User with this email already exists');
          }
        }
      }

      // Re-throw other errors
      throw error;
    }
  }
}
