# RBAC Local Ingress Troubleshooting & Fix Guide

## Problem Summary

- Ingress (nginx) was not routing host traffic to api-gateway; curl to http://rbac.local/health returned 'Connection reset by peer'.
- All backend pods and services were healthy and reachable inside the cluster.
- The root cause was a mismatch between kind host port mappings and ingress controller NodePort configuration.

## Step-by-Step Troubleshooting & Fixes

### 1. Verified Pod and Service Health

- Checked all pods in `rbac-dev` namespace: `kubectl -n rbac-dev get pods`
- Confirmed api-gateway Service endpoints: `kubectl -n rbac-dev get endpoints api-gateway`
- Probed backend from inside cluster:
  ```sh
  kubectl -n rbac-dev run tmp-curl --rm -i --tty --image=curlimages/curl --restart=Never -- curl -sS -D- http://api-gateway:3000/health
  ```
- Result: 200 OK from Service and Pod IPs.

### 2. Diagnosed Ingress Controller NodePort Issue

- Ingress controller was running as a NodePort service, but kind was mapping host 80/443 to container 80/443, not the NodePorts.
- Checked ingress controller Service:
  ```sh
  kubectl -n default get svc ingress-nginx-controller -o wide
  ```
- Found dynamic NodePorts (e.g., 30988/30375) instead of fixed ports.

### 3. Fixed NodePort and Host Port Mapping

- Updated `k8s/local/kind-config.yaml` to map host 80/443 to container 30080/30443.
- Installed ingress-nginx with Helm, pinning NodePorts:
  ```sh
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace default \
    --set controller.service.type=NodePort \
    --set controller.service.nodePorts.http=30080 \
    --set controller.service.nodePorts.https=30443
  ```
- Verified Service:
  ```sh
  kubectl -n default get svc ingress-nginx-controller -o wide
  # Should show 80:30080/TCP, 443:30443/TCP
  ```
- Checked kind Docker container port mapping:
  ```sh
  docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep kind-control-plane
  # Should show 0.0.0.0:80->30080/tcp, 0.0.0.0:443->30443/tcp
  ```

### 4. Recreated Kind Cluster (if needed)

- If port mapping was missing, recreated cluster:
  ```sh
  kind delete cluster
  kind create cluster --config k8s/local/kind-config.yaml
  ```
- Re-deployed apps and ingress manifests.

### 5. Final Verification

- Curl to NodePort (bypassing host port):
  ```sh
  curl -i http://localhost:30080/health
  ```
- Curl to host port with correct Host header:
  ```sh
  curl -i http://rbac.local/health
  curl -i http://rbac.local/docs
  ```
- Result: 200 OK and expected responses from api-gateway.

## Key Learnings

- Always align kind host port mappings with ingress controller NodePorts.
- Use Helm to pin ingress controller NodePorts for predictable routing.
- Use `/etc/hosts` to map custom domains (e.g., rbac.local) to 127.0.0.1.
- Test backend reachability from inside the cluster before debugging ingress.

## Reference Commands

- Check pod/service health: `kubectl -n <namespace> get pods|svc|endpoints`
- Probe service from cluster: `kubectl run ... curl ...`
- Inspect ingress controller: `kubectl get svc ingress-nginx-controller -o wide`
- Check Docker port mapping: `docker ps --format ...`
- Recreate kind cluster: `kind delete cluster && kind create cluster --config ...`
- Install ingress-nginx with Helm: see above

---

This guide documents the full troubleshooting and fix workflow for local RBAC ingress routing in kind + nginx environments.
