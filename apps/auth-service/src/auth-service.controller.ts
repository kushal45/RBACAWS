import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { AuthServiceService } from './auth-service.service';
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
import { JwtAuthGuard } from './guards/jwt-auth.guard';

import type { AuthenticatedRequest } from './interfaces/auth.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authService: AuthServiceService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password, return JWT tokens',
  })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Too many failed attempts',
  })
  async login(@Body() loginDto: LoginRequestDto, @Req() req: Request): Promise<LoginResponseDto> {
    const ip = req.ip ?? req.connection.remoteAddress ?? 'unknown';
    const userAgent = req.headers['user-agent'] ?? 'unknown';

    return this.authService.login(loginDto, ip, userAgent);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'User registration',
    description: 'Register a new user with specified type (admin, regular user, etc.)',
  })
  @ApiBody({ type: UserRegistrationRequestDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: UserRegistrationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error or user already exists',
  })
  async registerUser(
    @Body() registrationDto: UserRegistrationRequestDto,
  ): Promise<UserRegistrationResponseDto> {
    return this.authService.registerUser(registrationDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Get new access token using refresh token',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid refresh token',
  })
  async refreshToken(@Body() refreshDto: RefreshTokenRequestDto): Promise<LoginResponseDto> {
    return this.authService.refreshToken(refreshDto);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate JWT token',
    description: 'Check if a JWT token is valid and return user info',
  })
  @ApiBody({ type: ValidateTokenRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token validation result',
    type: ValidateTokenResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  async validateToken(
    @Body() validateDto: ValidateTokenRequestDto,
  ): Promise<ValidateTokenResponseDto> {
    return this.authService.validateToken(validateDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description: 'Invalidate JWT token and logout user',
  })
  @ApiBody({ type: LogoutRequestDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  logout(@Body() logoutDto: LogoutRequestDto): LogoutResponseDto {
    return this.authService.logout(logoutDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user info',
    description: 'Get authenticated user information from JWT token',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User information',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  getCurrentUser(@Req() req: AuthenticatedRequest): {
    id: string;
    email: string;
    tenantId: string;
  } {
    return req.user;
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check if the authentication service is running',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is healthy',
  })
  getHealth(): { status: string; timestamp: string } {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}
