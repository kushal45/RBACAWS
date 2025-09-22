# End-to-End Local Ingress Setup with Kind & NodePort Mapping

This guide provides a complete workflow and automation script for exposing services (e.g., api-gateway) via nginx ingress in a kind-based Kubernetes cluster, with reliable host port mapping for local development.

## Prerequisites

- Docker, kind, and Helm installed
- `/etc/hosts` entry: `127.0.0.1 rbac.local`

## 1. Kind Cluster Creation with Port Mapping

Update or create `k8s/local/kind-config.yaml`:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30080
        hostPort: 80
        protocol: TCP
      - containerPort: 30443
        hostPort: 443
        protocol: TCP
  - role: worker
  - role: worker
```

Create the cluster:

```sh
kind delete cluster
kind create cluster --config k8s/local/kind-config.yaml
```

## 2. Install nginx Ingress Controller with Fixed NodePorts

Install via Helm (in `default` namespace):

```sh
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace default \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443
```

## 3. Deploy Application Manifests

```sh
kubectl apply -f k8s/local/applications/services.yaml
kubectl apply -f k8s/local/ingress/ingress.yaml
```

## 4. Verify Setup

Check ingress controller service:

```sh
kubectl -n default get svc ingress-nginx-controller -o wide
```

Should show: `80:30080/TCP, 443:30443/TCP`

Check kind Docker port mapping:

```sh
docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep kind-control-plane
```

Should show: `0.0.0.0:80->30080/tcp, 0.0.0.0:443->30443/tcp`

## 5. Test Endpoints

```sh
curl -i http://rbac.local/health
curl -i http://rbac.local/docs
```

Should return HTTP 200 responses from your api-gateway.

---

## One-Shot Setup Script

Create `k8s/scripts/setup-local-ingress.sh`:

```sh
#!/bin/bash
set -e

# Step 1: Recreate kind cluster with port mapping
kind delete cluster || true
kind create cluster --config k8s/local/kind-config.yaml

# Step 2: Install nginx ingress controller with fixed NodePorts
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace default \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443

# Step 3: Deploy app and ingress manifests
kubectl apply -f k8s/local/applications/services.yaml
kubectl apply -f k8s/local/ingress/ingress.yaml

echo "Setup complete. Test with: curl -i http://rbac.local/health"
```

Make it executable:

```sh
chmod +x k8s/scripts/setup-local-ingress.sh
```

Run it:

```sh
k8s/scripts/setup-local-ingress.sh
```

---

## Notes

- This guide and script ensure that your ingress controller is always mapped to host ports 80/443 and routes traffic to the correct backend pods.
- All patches and configuration changes are applied automatically.
- For any future changes, update the manifests and rerun the script.

---

This documentation did not previously exist in the repo. It is now captured in this file for future reference and onboarding.
