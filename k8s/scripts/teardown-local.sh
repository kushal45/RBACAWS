#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")"/../.. && pwd)"

kubectl delete -f "$ROOT_DIR/k8s/local/applications/services.yaml" --ignore-not-found
kubectl delete -f "$ROOT_DIR/k8s/local/applications/config.yaml" --ignore-not-found
kubectl delete -f "$ROOT_DIR/k8s/local/databases/redis.yaml" --ignore-not-found
kubectl delete -f "$ROOT_DIR/k8s/local/databases/postgres.yaml" --ignore-not-found
kubectl delete -f "$ROOT_DIR/k8s/local/ingress/ingress.yaml" --ignore-not-found

echo "[ok] Deleted manifests. PersistentVolumeClaim postgres-pvc may persist; delete manually if needed: kubectl -n rbac-dev delete pvc postgres-pvc"
