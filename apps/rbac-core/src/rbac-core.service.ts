import { Injectable } from '@nestjs/common';

@Injectable()
export class RbacCoreService {
  getHello(): string {
    return 'Hello World!';
  }
}
