-- Database initialization script for RBAC system

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable row-level security
-- This will be configured per table in the actual migration files

-- Create indexes that will be useful for multi-tenant queries
-- These will be added as part of the migration scripts

-- Initial setup complete
SELECT 'RBAC Database initialized successfully' AS message;