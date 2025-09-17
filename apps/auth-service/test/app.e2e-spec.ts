import { Test } from '@nestjs/testing';
// import * as request from 'supertest';

import { AuthServiceModule } from '../src/auth-service.module';

import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';

describe('AuthServiceController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AuthServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    // return request(app.getHttpServer()).get('/').expect(200).expect('Hello World!');
  });
});
