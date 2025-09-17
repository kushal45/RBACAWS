import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  ParseEnumPipe,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
  TenantStatus,
  // TenantIsolationGuard,
} from '@lib/common';
import { TenantService } from '../services/tenant.service';

@ApiTags('Tenants')
@ApiBearerAuth()
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tenant created successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant name or slug already exists',
  })
  async createTenant(@Body() createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    return this.tenantService.createTenant(createTenantDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tenants with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: TenantStatus,
    description: 'Filter by tenant status' 
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of tenants retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        tenants: {
          type: 'array',
          items: { $ref: '#/components/schemas/TenantResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  async findAllTenants(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status', new ParseEnumPipe(TenantStatus, { optional: true })) status?: TenantStatus,
  ) {
    return this.tenantService.findAllTenants(page, limit, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tenant by ID' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant retrieved successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async findTenantById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.findTenantById(id);
  }

  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get tenant by slug' })
  @ApiParam({ name: 'slug', description: 'Tenant slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant retrieved successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async findTenantBySlug(@Param('slug') slug: string): Promise<TenantResponseDto> {
    return this.tenantService.findTenantBySlug(slug);
  }

  @Patch(':id')
  // @UseGuards(TenantIsolationGuard)
  @ApiOperation({ summary: 'Update tenant' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant updated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Tenant name already exists',
  })
  async updateTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantService.updateTenant(id, updateTenantDto);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend tenant' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant suspended successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async suspendTenant(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.suspendTenant(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate tenant' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tenant activated successfully',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  async activateTenant(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TenantResponseDto> {
    return this.tenantService.activateTenant(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tenant' })
  @ApiParam({ name: 'id', description: 'Tenant UUID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Tenant deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tenant not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete tenant with existing dependencies',
  })
  async deleteTenant(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tenantService.deleteTenant(id);
  }
}