import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditLogServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
