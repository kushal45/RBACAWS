#!/usr/bin/env node

/**
 * Environment Configuration Checker
 * This script checks if all required .env files exist and are properly configured
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: msg => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: msg => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: msg => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: msg => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  header: msg => console.log(`${colors.cyan}📋 ${msg}${colors.reset}`),
};

// Configuration for expected .env files
const envConfigs = [
  {
    name: 'Shared Config',
    path: '.env',
    examplePath: '.env.example',
    required: false,
  },
  {
    name: 'API Gateway',
    path: 'apps/api-gateway/.env',
    examplePath: 'apps/api-gateway/.env.example',
    required: true,
    requiredVars: ['PORT', 'SERVICE_REGISTRY_CONFIG_PATH', 'CORS_ORIGIN'],
  },
  {
    name: 'Auth Service',
    path: 'apps/auth-service/.env',
    examplePath: 'apps/auth-service/.env.example',
    required: true,
    requiredVars: ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'],
  },
  {
    name: 'RBAC Core',
    path: 'apps/rbac-core/.env',
    examplePath: 'apps/rbac-core/.env.example',
    required: true,
    requiredVars: ['PORT', 'DATABASE_URL', 'DEFAULT_TENANT_ID'],
  },
  {
    name: 'Audit Log Service',
    path: 'apps/audit-log-service/.env',
    examplePath: 'apps/audit-log-service/.env.example',
    required: true,
    requiredVars: ['PORT', 'DATABASE_URL', 'AUDIT_RETENTION_DAYS'],
  },
];

function checkFileExists(filePath) {
  return fs.existsSync(filePath);
}

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const vars = {};

    content.split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          vars[key] = valueParts.join('=');
        }
      }
    });

    return vars;
  } catch (error) {
    return null;
  }
}

function checkEnvironmentConfig() {
  log.header('Environment Configuration Check');
  console.log('');

  let hasErrors = false;
  let hasWarnings = false;

  for (const config of envConfigs) {
    log.info(`Checking ${config.name}...`);

    // Check if example file exists
    if (!checkFileExists(config.examplePath)) {
      log.error(`Example file missing: ${config.examplePath}`);
      hasErrors = true;
      continue;
    }

    // Check if .env file exists
    if (!checkFileExists(config.path)) {
      if (config.required) {
        log.error(`Required .env file missing: ${config.path}`);
        log.info(`  Run: cp ${config.examplePath} ${config.path}`);
        hasErrors = true;
      } else {
        log.warning(`Optional .env file missing: ${config.path}`);
        hasWarnings = true;
      }
      continue;
    }

    log.success(`Found: ${config.path}`);

    // Check required variables
    if (config.requiredVars && config.requiredVars.length > 0) {
      const envVars = parseEnvFile(config.path);

      if (!envVars) {
        log.error(`Failed to parse: ${config.path}`);
        hasErrors = true;
        continue;
      }

      const missingVars = config.requiredVars.filter(varName => !envVars[varName]);

      if (missingVars.length > 0) {
        log.error(`Missing required variables in ${config.path}:`);
        missingVars.forEach(varName => {
          console.log(`    - ${varName}`);
        });
        hasErrors = true;
      } else {
        log.success(`All required variables present in ${config.path}`);
      }

      // Check for default/example values that should be changed
      const defaultValues = [
        'your-super-secret-jwt-key-change-this-in-production',
        'your-super-secret-refresh-token-key-change-this-in-production',
        'your-session-secret-change-this-in-production',
        'password',
        'your_db_username',
        'your_db_password',
      ];

      const hasDefaultValues = Object.values(envVars).some(value =>
        defaultValues.some(defaultVal => value && value.includes(defaultVal)),
      );

      if (hasDefaultValues) {
        log.warning(`${config.path} contains default values that should be changed for production`);
        hasWarnings = true;
      }
    }

    console.log('');
  }

  // Summary
  console.log('');
  log.header('Summary');

  if (hasErrors) {
    log.error('Environment configuration has errors that need to be fixed');
    process.exit(1);
  } else if (hasWarnings) {
    log.warning('Environment configuration has warnings but is functional');
    log.info('Run `npm run env:setup` to create missing optional files');
  } else {
    log.success('Environment configuration looks good!');
  }

  console.log('');
  log.info('For detailed setup guide, see: ENV_SETUP.md');
}

// Run the check
checkEnvironmentConfig();
