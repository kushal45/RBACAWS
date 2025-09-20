#!/usr/bin/env bash
set -euo pipefail

# Deploy local Kubernetes manifests for rbacaws
# Assumes a kind cluster is available. To create: kind create cluster --config k8s/local/kind-config.yaml

ROOT_DIR="$(cd "$(dirname "$0")"/../.. && pwd)"

kubectl apply -f "$ROOT_DIR/k8s/local/databases/postgres.yaml"
kubectl apply -f "$ROOT_DIR/k8s/local/databases/redis.yaml"
kubectl apply -f "$ROOT_DIR/k8s/local/applications/config.yaml"
kubectl apply -f "$ROOT_DIR/k8s/local/applications/services.yaml"

# Ingress is optional; requires an ingress controller like nginx to be installed in the cluster
if kubectl get ns ingress-nginx >/dev/null 2>&1; then
  kubectl apply -f "$ROOT_DIR/k8s/local/ingress/ingress.yaml"
else
  echo "[info] Skipping ingress.yaml (no ingress-nginx namespace). Install ingress-nginx to use Ingress."
fi

printf '\n[ok] Applied all manifests. Namespace: rbac-dev\n'
echo "- Port-forward API Gateway: kubectl -n rbac-dev port-forward svc/api-gateway 3000:3000"
echo "- Debug auth-service:        kubectl -n rbac-dev port-forward deploy/auth-service 9229:9229"
echo "- Debug api-gateway:         kubectl -n rbac-dev port-forward deploy/api-gateway 9230:9229"
echo "- Debug rbac-core:           kubectl -n rbac-dev port-forward deploy/rbac-core 9231:9229"
echo "- Debug audit-log-service:   kubectl -n rbac-dev port-forward deploy/audit-log-service 9232:9229"
