import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Tenant,
  TenantStatus,
  CreateTenantDto,
  UpdateTenantDto,
  TenantResponseDto,
} from '@lib/common';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepository: Repository<Tenant>,
  ) {}

  async createTenant(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    // Check if tenant with same name or slug already exists
    const existingTenant = await this.tenantRepository.findOne({
      where: [
        { name: createTenantDto.name },
        { slug: createTenantDto.slug },
      ],
    });

    if (existingTenant) {
      if (existingTenant.name === createTenantDto.name) {
        throw new ConflictException('Tenant with this name already exists');
      }
      if (existingTenant.slug === createTenantDto.slug) {
        throw new ConflictException('Tenant with this slug already exists');
      }
    }

    const tenant = this.tenantRepository.create({
      ...createTenantDto,
      status: createTenantDto.status || TenantStatus.ACTIVE,
    });

    const savedTenant = await this.tenantRepository.save(tenant);
    return this.mapToResponseDto(savedTenant);
  }

  async findAllTenants(
    page: number = 1,
    limit: number = 10,
    status?: TenantStatus,
  ): Promise<{ tenants: TenantResponseDto[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.tenantRepository.createQueryBuilder('tenant');
    
    if (status) {
      queryBuilder.where('tenant.status = :status', { status });
    }

    const [tenants, total] = await queryBuilder
      .orderBy('tenant.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      tenants: tenants.map(tenant => this.mapToResponseDto(tenant)),
      total,
      page,
      limit,
    };
  }

  async findTenantById(id: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mapToResponseDto(tenant);
  }

  async findTenantBySlug(slug: string): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return this.mapToResponseDto(tenant);
  }

  async updateTenant(id: string, updateTenantDto: UpdateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check for conflicts if name is being updated
    if (updateTenantDto.name && updateTenantDto.name !== tenant.name) {
      const existingTenant = await this.tenantRepository.findOne({
        where: { name: updateTenantDto.name },
      });

      if (existingTenant && existingTenant.id !== id) {
        throw new ConflictException('Tenant with this name already exists');
      }
    }

    // Merge the updates
    Object.assign(tenant, updateTenantDto);
    const updatedTenant = await this.tenantRepository.save(tenant);

    return this.mapToResponseDto(updatedTenant);
  }

  async suspendTenant(id: string): Promise<TenantResponseDto> {
    return this.updateTenantStatus(id, TenantStatus.SUSPENDED);
  }

  async activateTenant(id: string): Promise<TenantResponseDto> {
    return this.updateTenantStatus(id, TenantStatus.ACTIVE);
  }

  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
      relations: ['users', 'roles', 'resources'],
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if tenant has dependencies
    if (tenant.users?.length > 0 || tenant.roles?.length > 0 || tenant.resources?.length > 0) {
      throw new BadRequestException(
        'Cannot delete tenant with existing users, roles, or resources. Please remove all dependencies first.',
      );
    }

    await this.tenantRepository.remove(tenant);
  }

  private async updateTenantStatus(id: string, status: TenantStatus): Promise<TenantResponseDto> {
    const tenant = await this.tenantRepository.findOne({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    tenant.status = status;
    const updatedTenant = await this.tenantRepository.save(tenant);

    return this.mapToResponseDto(updatedTenant);
  }

  private mapToResponseDto(tenant: Tenant): TenantResponseDto {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      description: tenant.description,
      status: tenant.status,
      config: tenant.config,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }
}