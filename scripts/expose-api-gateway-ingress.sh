#!/bin/bash
# Expose api-gateway via Ingress for local development
# Prerequisites: kind cluster running, nginx ingress controller installed, /etc/hosts entry for rbac.local

set -e

# Apply the ingress resource
echo "Applying Ingress for api-gateway..."
kubectl apply -f k8s/local/ingress/ingress.yaml

echo "Ensure nginx ingress controller is running."
echo "Add this to your /etc/hosts if not present:"
echo "127.0.0.1 rbac.local"

echo "Access api-gateway at http://rbac.local/"
