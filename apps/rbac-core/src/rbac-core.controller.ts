import { Controller, Get } from '@nestjs/common';
import { RbacCoreService } from './rbac-core.service';

@Controller()
export class RbacCoreController {
  constructor(private readonly rbacCoreService: RbacCoreService) {}

  @Get()
  getHello(): string {
    return this.rbacCoreService.getHello();
  }
}
