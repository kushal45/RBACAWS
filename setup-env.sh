#!/bin/bash

# RBAC AWS Monorepo - Environment Setup Script
# This script copies all .env.example files to .env files for local development

set -e

echo "🚀 Setting up environment files for RBAC AWS Monorepo..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to copy env file if it doesn't exist
copy_env_file() {
    local source=$1
    local target=$2
    local service_name=$3

    if [ -f "$target" ]; then
        echo -e "${YELLOW}⚠️  $target already exists, skipping...${NC}"
    else
        cp "$source" "$target"
        echo -e "${GREEN}✅ Created $target for $service_name${NC}"
    fi
}

echo -e "${BLUE}📁 Setting up shared environment configuration...${NC}"
copy_env_file ".env.example" ".env" "Shared Config"

echo -e "${BLUE}🚪 Setting up API Gateway environment...${NC}"
copy_env_file "apps/api-gateway/.env.example" "apps/api-gateway/.env" "API Gateway"

echo -e "${BLUE}🔐 Setting up Auth Service environment...${NC}"
copy_env_file "apps/auth-service/.env.example" "apps/auth-service/.env" "Auth Service"

echo -e "${BLUE}👥 Setting up RBAC Core environment...${NC}"
copy_env_file "apps/rbac-core/.env.example" "apps/rbac-core/.env" "RBAC Core"

echo -e "${BLUE}📊 Setting up Audit Log Service environment...${NC}"
copy_env_file "apps/audit-log-service/.env.example" "apps/audit-log-service/.env" "Audit Log Service"

echo ""
echo -e "${GREEN}🎉 Environment setup completed!${NC}"
echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Review and customize the .env files for your local setup"
echo "2. Update database credentials in each service's .env file"
echo "3. Generate new JWT secrets for production environments"
echo "4. Run 'npm install' to install dependencies"
echo "5. Start the services with 'npm run start:dev'"
echo ""
echo -e "${BLUE}📖 For detailed configuration guide, see: ENV_SETUP.md${NC}"
echo ""
echo -e "${RED}🔒 Security reminder:${NC}"
echo "- Never commit .env files to version control"
echo "- Change all default secrets before deployment"
echo "- Use environment-specific configurations for production"
