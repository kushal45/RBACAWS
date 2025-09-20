# Local Kubernetes (kind) development and debugging

This guide helps you run and debug the RBAC monorepo on a local Kubernetes cluster using kind.

## Prerequisites

- Docker
- kind

```sh
# Check if a kind cluster exists
kind get clusters || true

# Create the default-named cluster if none exists
kind create cluster --config k8s/local/kind-config.yaml
```

## 2) Load images into kind

Kind cannot pull images from your local Docker daemon by tag unless loaded. Build first, then load:

```sh
# Build all images (from repo root)
./scripts/build-all.sh local

# Load into kind (default cluster name is "kind"). If your cluster has a different name, add --name <clusterName>.
kind load docker-image rbacaws/api-gateway:local
kind load docker-image rbacaws/auth-service:local
kind load docker-image rbacaws/rbac-core:local
kind load docker-image rbacaws/audit-log-service:local

# Troubleshooting: If you see "ERROR: no nodes found for cluster \"kind\"",
# create the cluster first or specify the correct cluster name:
# kind create cluster --config k8s/local/kind-config.yaml --name my-cluster
# kind load docker-image --name my-cluster rbacaws/api-gateway:local
```

## 3) Deploy manifests

```sh
chmod +x k8s/scripts/*.sh
k8s/scripts/deploy-local.sh
```

This applies:

- Namespace, Postgres (StatefulSet + PVC + Service)
- Redis (Deployment + Service)
- App ConfigMaps/Secrets (including route-mappings)
- Service Deployments + Services
- Optional Ingress (if ingress-nginx is installed)

Check status:

```sh
kubectl get pods -n rbac-dev -w
```

## 4) Access services

- Port-forward API Gateway:

```sh
kubectl -n rbac-dev port-forward svc/api-gateway 3000:3000
```

Open http://localhost:3000/docs

- If using Ingress (requires ingress-nginx):
  - Install once: https://kubernetes.github.io/ingress-nginx/deploy/
  - Apply ingress: `kubectl apply -f k8s/local/ingress/ingress.yaml`
  - Add host entry: `echo "127.0.0.1 rbac.local" | sudo tee -a /etc/hosts`
  - Open http://rbac.local

## 5) Debugging inside Kubernetes

Each service exposes Node.js inspector on 9229 inside the pod. Use unique local ports when forwarding so you can debug multiple services at once.

- Port-forward debug ports:

```sh
# Auth Service
kubectl -n rbac-dev port-forward deploy/auth-service 9229:9229
# API Gateway
kubectl -n rbac-dev port-forward deploy/api-gateway 9230:9229
# RBAC Core
kubectl -n rbac-dev port-forward deploy/rbac-core 9231:9229
# Audit Log Service
kubectl -n rbac-dev port-forward deploy/audit-log-service 9232:9229
```

- Attach VS Code debugger using the matching attach configs in `.vscode/launch.json`:
  - Attach: auth-service (k8s) → localhost:9229
  - Attach: api-gateway (k8s) → localhost:9230
  - Attach: rbac-core (k8s) → localhost:9231
  - Attach: audit-log-service (k8s) → localhost:9232

## 6) Database access

Forward Postgres if you want to inspect data locally:

```sh
kubectl -n rbac-dev port-forward svc/postgres 5432:5432
```

Connection string: `postgres://postgres:password@localhost:5432/rbac_dev`

## 7) Teardown

Note: The PVC `postgres-pvc` persists by default. Delete if needed:

kubectl -n rbac-dev delete pvc postgres-pvc

---

## 8) Ingress (nginx) — install, verify, and use

Install (kind-optimized):

```sh
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/kind/deploy.yaml
kubectl -n ingress-nginx wait --for=condition=Ready pod -l app.kubernetes.io/component=controller --timeout=180s
```

Add host entry (macOS):

```sh
echo "127.0.0.1 rbac.local" | sudo tee -a /etc/hosts
```

Apply project ingress:

```sh
kubectl apply -f k8s/local/ingress/ingress.yaml
kubectl -n rbac-dev get ingress
```

Verify end-to-end:

```sh
kubectl -n rbac-dev get svc api-gateway
kubectl -n ingress-nginx get pods
open http://rbac.local
```

Purpose:

- Single HTTP(S) entrypoint, host/path routing.
- Local parity with cloud ingress controllers.
- Easy TLS later with cert-manager.

---

## 9) Config and Secrets (how they’re used)

- ConfigMap app-config: NODE_ENV, LOG_LEVEL, DB/Redis hosts/ports, ROUTE_MAPPINGS_PATH=/config/route-mappings.json.
- Secret app-secrets: DATABASE_PASSWORD (dev only).
- ConfigMap route-mappings: JSON embedded and mounted at /config for api-gateway.

Notes:

- Kubernetes does not expand ${VAR} inside ConfigMaps. Use ClusterIP DNS names (e.g., http://auth-service:3200) in route-mappings.json.
- To update route mappings:
  ```sh
  kubectl -n rbac-dev apply -f k8s/local/applications/config.yaml
  kubectl -n rbac-dev rollout restart deploy/api-gateway
  ```

---

## 10) Image build, load, and rolling updates

- Build images:
  ```sh
  ./scripts/build-all.sh local
  ```
- Load into kind:
  ```sh
  kind load docker-image rbacaws/api-gateway:local
  kind load docker-image rbacaws/auth-service:local
  kind load docker-image rbacaws/rbac-core:local
  kind load docker-image rbacaws/audit-log-service:local
  ```
- Restart deployments to pick new images:
  ```sh
  kubectl -n rbac-dev rollout restart deploy/api-gateway deploy/auth-service deploy/rbac-core deploy/audit-log-service
  kubectl -n rbac-dev rollout status deploy/api-gateway
  ```

Tip: For fast inner loops, consider Skaffold or Tilt (optional).

---

## 11) Debugging with VS Code (Node inspector)

Port-forward inspector:

```sh
kubectl -n rbac-dev port-forward deploy/api-gateway 9229:9229
```

Sample VS Code launch config (attach):

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach: api-gateway (k8s)",
      "address": "localhost",
      "port": 9229,
      "restart": true,
      "protocol": "inspector",
      "sourceMaps": true,
      "resolveSourceMapLocations": ["**", "!**/node_modules/**"]
    }
  ]
}
```

Repeat with different local ports for other services (9230, 9231, 9232).

---

## 12) Database (Postgres) and Redis

Port-forward Postgres:

```sh
kubectl -n rbac-dev port-forward svc/postgres 5432:5432
```

Connect string:

```
postgres://postgres:password@localhost:5432/rbac_dev
```

psql on macOS:

```sh
brew install libpq
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
psql "postgres://postgres:password@localhost:5432/rbac_dev"
```

Redis port-forward:

```sh
kubectl -n rbac-dev port-forward svc/redis 6379:6379
```

---

## 13) Health checks and readiness (optional but recommended)

Add to Deployments (liveness/readiness probing your /health endpoint), example:

```yaml
livenessProbe:
  httpGet: { path: /health, port: 3000 }
  initialDelaySeconds: 10
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /health, port: 3000 }
  initialDelaySeconds: 5
  periodSeconds: 5
```

Adjust port per service (api-gateway 3000, auth 3200, rbac-core 3100, audit-log 3300).

---

## 14) Common operations (cheat sheet)

- Watch pods:
  ```sh
  kubectl -n rbac-dev get pods -w
  ```
- Describe failures:
  ```sh
  kubectl -n rbac-dev describe pod <pod>
  ```
- View logs:
  ```sh
  kubectl -n rbac-dev logs deploy/api-gateway -f
  ```
- Exec shell:
  ```sh
  kubectl -n rbac-dev exec -it deploy/api-gateway -- sh
  ```

---

## 15) Troubleshooting

- imagePullBackOff in kind:
  - Re-run kind load docker-image … and rollout restart deployments.
- 404 at rbac.local:
  - Check ingress exists in rbac-dev, controller is Ready in ingress-nginx, and api-gateway Service endpoints exist.
- Debugger not attaching:
  - Ensure deployments are running the dev images (CMD uses Nest `--debug 0.0.0.0:9229`).
  - Ensure port-forward is active and the correct local port matches your VS Code config.
  - Redeploy if you previously set NODE_OPTIONS in the manifests; current manifests remove it to avoid conflicts.
- CrashLoopBackOff:
  - Check env vars from app-config/app-secrets and DB reachability (port-forward Postgres to test).
- Config changes not reflected:
  - Re-apply ConfigMap/Secret and rollout restart the affected deployment.

---

## 16) Cloud migration notes (quick)

- Keep Ingress minimal; swap controller per cloud (AWS ALB, GKE, AGIC).
- Use cert-manager for TLS, ExternalDNS for DNS automation.
- Replace in-cluster Postgres/Redis with managed services; keep names/env keys consistent via Secrets.
- Add NetworkPolicies and run containers as non-root in production.

## 17) Running Postgres DB Migrations in Kubernetes

You can run database migrations directly inside the Postgres pod or from your local machine using port-forwarding. This is useful for applying schema changes, running seed scripts, or troubleshooting.

### Option 1: Exec into the Postgres Pod

1. Find the Postgres pod name:

   ```sh
   kubectl -n rbac-dev get pods -l app=postgres
   ```

   Example output: `postgres-0`

2. Copy your migration SQL file into the pod (if needed):

   ```sh
   kubectl -n rbac-dev cp migrations/init-db.sql postgres-0:/tmp/init-db.sql
   ```

3. Exec into the pod and run the migration:
   ```sh
   kubectl -n rbac-dev exec -it postgres-0 -- sh
   # Inside pod shell:
   psql -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/init-db.sql
   # Or for ad-hoc commands:
   psql -U $POSTGRES_USER -d $POSTGRES_DB
   ```

### Option 2: Run Migrations from Local Machine (Port-Forward)

1. Port-forward the Postgres service:

   ```sh
   kubectl -n rbac-dev port-forward svc/postgres 5432:5432
   ```

2. Run migration using psql locally:
   ```sh
   psql "postgres://postgres:password@localhost:5432/rbac_dev" -f migrations/init-db.sql
   ```

### Option 3: Automate with Kubernetes Jobs (Advanced)

You can create a Kubernetes Job manifest to run migrations automatically on cluster startup or as part of CI/CD. Example:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate-db
  namespace: rbac-dev
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: postgres:15-alpine
          command: ['psql']
          args:
            [
              '-U',
              'postgres',
              '-d',
              'rbac_dev',
              '-f',
              '/migrations/init-db.sql'
            ]
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: POSTGRES_PASSWORD
          volumeMounts:
            - name: migration-scripts
              mountPath: /migrations
      restartPolicy: Never
      volumes:
        - name: migration-scripts
          hostPath:
            path: /absolute/path/to/migrations
            type: Directory
```

Apply with:

- SQL file migration Job (psql):
  ```sh
  kubectl -n rbac-dev apply -f k8s/local/databases/migrate-job.yaml
  ```
- TypeORM npm migration Job:
  ```sh
  kubectl -n rbac-dev apply -f k8s/local/databases/migrate-typeorm-job.yaml
  ```

### Best Practices & Tips

- Always backup your database before running migrations in production.
- Use secrets for credentials, never hardcode passwords in scripts.
- For repeatable migrations, use a migration tool (e.g., TypeORM, Prisma, Flyway) and run it in a Job or CI/CD pipeline.
- Clean up Jobs after completion:
  ```sh
  kubectl -n rbac-dev delete job migrate-db
  ```
- For troubleshooting, use `kubectl logs job/migrate-db -n rbac-dev` or `kubectl logs job/migrate-typeorm -n rbac-dev`.

### Option 4: Run `npm run migration:run` inside an app pod

You can also exec into a running app pod that has the repository and node_modules (dev images) and run the same npm script directly:

```sh
# Example using rbac-core deployment
kubectl -n rbac-dev exec -it deploy/rbac-core -- sh -lc 'cd /app && npm run migration:run'
```

Notes:

- Ensure the pod has env vars from `app-config` and `app-secrets` so TypeORM connects to the in-cluster Postgres (`postgres:5432`).
- Replace `deploy/rbac-core` with any other app deployment (e.g., `deploy/api-gateway`).

---

## Notes

- Config is provided via ConfigMap `app-config` and Secret `app-secrets`.
- API Gateway reads route mappings from `/config/route-mappings.json` mounted from ConfigMap `route-mappings`.
- Services run with `NODE_OPTIONS=--inspect=0.0.0.0:9229` for debugging; ensure you only expose this in local/dev environments.
