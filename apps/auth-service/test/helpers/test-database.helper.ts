/* eslint-disable no-console */
import { execSync } from 'child_process';

import { DataSource } from 'typeorm';

/**
 * Test Database Helper
 *
 * Provides utilities for setting up, cleaning, and tearing down test databases
 * to ensure isolated and reliable testing environment.
 */
export class TestDatabaseHelper {
  private readonly testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
    username: process.env.TEST_DB_USERNAME || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB_NAME || 'postgres',
  };

  /**
   * Setup test database by creating database and user if they don't exist
   */
  async setupTestDatabase(): Promise<void> {
    try {
      console.log('Setting up test database...');

      // Wait for PostgreSQL to be ready (removed psql dependency)
      await this.waitForDatabase();

      console.log('Test database setup completed');
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw new Error(`Test database setup failed: ${error}`);
    }
  }

  /**
   * Clean database by truncating all tables while preserving structure
   */
  async cleanDatabase(dataSource: DataSource): Promise<void> {
    try {
      // Get all table names
      const entities = dataSource.entityMetadatas;

      // Disable foreign key checks
      await dataSource.query('SET session_replication_role = replica;');

      // Truncate all tables
      for (const entity of entities) {
        const { tableName } = entity;
        await dataSource.query(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE;`);
      }

      // Re-enable foreign key checks
      await dataSource.query('SET session_replication_role = DEFAULT;');
    } catch (error) {
      console.error('Failed to clean database:', error);
      throw error;
    }
  }

  /**
   * Teardown test database
   */
  teardownTestDatabase(): void {
    try {
      console.log('Tearing down test database...');
      // In a real scenario, you might want to drop the test database
      // For now, we'll just log the completion
      console.log('Test database teardown completed');
    } catch (error) {
      console.error('Failed to teardown test database:', error);
      // Don't throw here as we don't want to break the test teardown
    }
  }

  /**
   * Check if PostgreSQL is accessible
   */
  private checkPostgreSQLConnection(): void {
    try {
      const psqlCheck = `psql -h ${this.testDbConfig.host} -p ${this.testDbConfig.port} -U postgres -d postgres -c "SELECT 1;" 2>/dev/null`;
      execSync(psqlCheck, { stdio: 'pipe' });
    } catch (error) {
      console.error('PostgreSQL connection check failed:', error);
      throw new Error(
        `PostgreSQL connection failed. Please ensure PostgreSQL is running on ${this.testDbConfig.host}:${this.testDbConfig.port}. ` +
          'You can start it with Docker: docker run --name postgres-test -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres:15',
      );
    }
  }

  /**
   * Create test database and user if they don't exist
   */
  private createTestDatabaseIfNotExists(): void {
    try {
      // Create user if not exists
      const createUser = `psql -h ${this.testDbConfig.host} -p ${this.testDbConfig.port} -U postgres -d postgres -c "CREATE USER ${this.testDbConfig.username} WITH PASSWORD '${this.testDbConfig.password}';" 2>/dev/null || true`;
      execSync(createUser, { stdio: 'pipe' });

      // Create database if not exists
      const createDb = `psql -h ${this.testDbConfig.host} -p ${this.testDbConfig.port} -U postgres -d postgres -c "CREATE DATABASE ${this.testDbConfig.database} OWNER ${this.testDbConfig.username};" 2>/dev/null || true`;
      execSync(createDb, { stdio: 'pipe' });

      // Grant privileges
      const grantPrivileges = `psql -h ${this.testDbConfig.host} -p ${this.testDbConfig.port} -U postgres -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${this.testDbConfig.database} TO ${this.testDbConfig.username};" 2>/dev/null || true`;
      execSync(grantPrivileges, { stdio: 'pipe' });
    } catch (error) {
      console.warn('Database creation commands failed (might already exist):', error);
      // Continue anyway - database might already exist
    }
  }

  /**
   * Get test database configuration
   */
  getTestDatabaseConfig() {
    return this.testDbConfig;
  }

  /**
   * Wait for database to be ready using TypeORM connection
   */
  async waitForDatabase(maxAttempts = 30, delay = 1000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const testDataSource = new DataSource({
          type: 'postgres',
          host: this.testDbConfig.host,
          port: this.testDbConfig.port,
          username: this.testDbConfig.username,
          password: this.testDbConfig.password,
          database: this.testDbConfig.database,
        });

        await testDataSource.initialize();
        await testDataSource.query('SELECT 1');
        await testDataSource.destroy();

        return; // Connection successful
      } catch {
        if (attempt === maxAttempts) {
          throw new Error(`Database not ready after ${maxAttempts} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}
