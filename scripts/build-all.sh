#!/usr/bin/env bash
set -euo pipefail

# Simple image build script for local development and production
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

TAG=${1:-local}
# Optional second arg: target stage (dev|runtime). If not provided, infer:
# - TAG==local -> dev stage (hot-reload/debug)
# - otherwise  -> runtime stage (production)
TARGET=${2:-}
if [ -z "$TARGET" ]; then
	if [ "$TAG" = "local" ]; then
		TARGET="dev"
	else
		TARGET="runtime"
	fi
fi

echo "Building images with tag: ${TAG}, target stage: ${TARGET}"

echo "Building api-gateway image..."
docker build -f Dockerfile.api-gateway --target "${TARGET}" -t rbacaws/api-gateway:${TAG} .

echo "Building auth-service image..."
docker build -f Dockerfile.auth-service --target "${TARGET}" -t rbacaws/auth-service:${TAG} .

echo "Building rbac-core image..."
docker build -f Dockerfile.rbac-core --target "${TARGET}" -t rbacaws/rbac-core:${TAG} .

echo "Building audit-log-service image..."
docker build -f Dockerfile.audit-log-service --target "${TARGET}" -t rbacaws/audit-log-service:${TAG} .

echo "All images built with tag: ${TAG} (stage: ${TARGET})"
