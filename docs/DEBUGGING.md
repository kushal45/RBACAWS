# VS Code Debugging Guide

## 🐳 Kubernetes Debugging from Pods

This section provides a step-by-step guide for attaching the VS Code Node.js debugger to services running inside Kubernetes pods.

### 1. Inspector Startup Verification

- Check pod logs for:
  - `Debugger listening on ws://0.0.0.0:9229/…`
- If you see repeated “address already in use” or no “Debugger listening”, the inspector isn’t running correctly.

### 2. Dev Image and Command

- Ensure your deployment uses the dev image and starts with:
  - `nest start <service> --watch --debug 0.0.0.0:9229`
- Check your Dockerfile and deployment YAML for this command.

### 3. Port-forwarding

- Run in separate terminals:
  ```sh
  kubectl -n rbac-dev port-forward deploy/auth-service 9229:9229
  kubectl -n rbac-dev port-forward deploy/api-gateway 9230:9229
  kubectl -n rbac-dev port-forward deploy/rbac-core 9231:9229
  kubectl -n rbac-dev port-forward deploy/audit-log-service 9232:9229
  ```
- You should see: `Forwarding from 127.0.0.1:<localPort> -> 9229`

### 4. VS Code Attach Configuration

- Use the following in `.vscode/launch.json`:
  ```json
  {
    "type": "node",
    "request": "attach",
    "name": "Attach: auth-service (k8s)",
    "address": "localhost",
    "port": 9229,
    "localRoot": "${workspaceFolder}",
    "remoteRoot": "/app",
    "protocol": "inspector"
  }
  ```
- Select the matching config and start debugging.

### 5. Port Usage Check

- Run `lsof -i :9229` to confirm only the port-forward is using it.

### 6. Inspector Connectivity Test

- Run:
  ```sh
  curl http://localhost:9229/json/list
  ```
- If you get a JSON response, the inspector is reachable.

### 7. Troubleshooting

- If VS Code fails to attach:
  - Check for errors like "Cannot connect to runtime process" or "Timeout".
  - Confirm port-forward is active and matches your VS Code config.
  - Restart VS Code if needed.
  - If breakpoints don't hit, check `localRoot`/`remoteRoot` mapping for source maps.

### 8. What to Share for Help

- Pod logs (showing inspector status)
- Port-forward command and output
- VS Code launch config
- Confirmation of dev image usage
- Any error message from VS Code

This process ensures you can reliably debug Node.js services running in Kubernetes pods from your local VS Code, with full source map support and no port conflicts.
This guide explains how to debug the RBAC AWS monorepo applications and tests using the comprehensive VS Code debugging configurations provided.

## 🚀 Available Debug Configurations

### Service Debugging

| Configuration              | Description                      | Port | Purpose                                   |
| -------------------------- | -------------------------------- | ---- | ----------------------------------------- |
| 🚀 Debug API Gateway       | Debug the API Gateway service    | 3000 | Main entry point, routing, authentication |
| 🔐 Debug Auth Service      | Debug the Authentication service | 3001 | JWT authentication, user management       |
| 🛡️ Debug RBAC Core         | Debug the RBAC Core service      | 3100 | Role-based access control, permissions    |
| 📋 Debug Audit Log Service | Debug the Audit Log service      | 3002 | Audit logging and compliance              |

### Test Debugging

| Configuration                    | Description                        | Purpose                        |
| -------------------------------- | ---------------------------------- | ------------------------------ |
| 🧪 Debug All Tests               | Run all tests with debugging       | Debug entire test suite        |
| 🧪 Debug Current Test File       | Debug the currently open test file | Debug specific test file       |
| 🧪 Debug Auth Service Tests      | Debug all auth service tests       | Focus on auth service testing  |
| 🧪 Debug API Gateway Tests       | Debug all API gateway tests        | Focus on gateway testing       |
| 🧪 Debug RBAC Core Tests         | Debug all RBAC core tests          | Focus on RBAC testing          |
| 🧪 Debug Audit Log Service Tests | Debug all audit service tests      | Focus on audit service testing |

### Specialized Test Debugging

| Configuration                   | Description                           | Purpose                      |
| ------------------------------- | ------------------------------------- | ---------------------------- |
| 🎯 Debug Specific Test          | Debug a specific test by name pattern | Target individual tests      |
| 🎯 Debug Test with Pattern      | Debug tests matching a file pattern   | Filter tests by file pattern |
| 🔄 Debug Auth Service E2E Tests | Debug end-to-end auth service tests   | Integration testing          |
| 👀 Debug Tests in Watch Mode    | Debug tests with file watching        | Continuous testing           |

### Docker & Compound Debugging

| Configuration                | Description                        | Purpose                  |
| ---------------------------- | ---------------------------------- | ------------------------ |
| 🐳 Debug in Docker Container | Attach to running Docker container | Debug containerized apps |
| 🚀 Debug All Services        | Start all services simultaneously  | Full system debugging    |

## 🛠️ How to Use

### 1. Debugging a Service

1. Open VS Code in the project root
2. Go to **Run and Debug** panel (Ctrl+Shift+D)
3. Select the service you want to debug (e.g., "🔐 Debug Auth Service")
4. Set breakpoints in your code
5. Press **F5** or click the play button
6. The service will start with debugging enabled

### 2. Debugging Tests

#### Debug Current Test File

1. Open a `.spec.ts` file in the editor
2. Select "🧪 Debug Current Test File"
3. Press **F5**
4. VS Code will debug only the tests in the current file

#### Debug Specific Test

1. Select "🎯 Debug Specific Test"
2. Enter the test name pattern when prompted
3. The debugger will run only tests matching that pattern

#### Debug All Tests for a Service

1. Select the appropriate service test configuration
2. All tests for that service will run with debugging enabled

### 3. Setting Breakpoints

- Click in the gutter next to line numbers to set breakpoints
- Use conditional breakpoints for complex debugging scenarios
- Set logpoints to log values without stopping execution

### 4. Environment Variables

All configurations automatically load:

- `.env` file from the project root
- Appropriate `NODE_ENV` settings
- Service-specific port configurations

## 🔧 Configuration Details

### Runtime Arguments

All Node.js configurations include:

```json
"runtimeArgs": [
  "-r", "ts-node/register",
  "-r", "tsconfig-paths/register"
]
```

### Test Arguments

Test configurations include:

```json
"args": [
  "--runInBand",        // Run tests serially for debugging
  "--detectOpenHandles", // Detect open handles that prevent exit
  "--forceExit"         // Force exit after tests complete
]
```

### Source Maps

All configurations enable source maps for accurate debugging:

```json
"sourceMaps": true
```

## 📁 Project Structure Support

The debugging configurations are designed for the monorepo structure:

```
apps/
  ├── api-gateway/
  ├── auth-service/
  ├── rbac-core/
  └── audit-log-service/
libs/
  └── common/
```

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**: Make sure no other instances are running
2. **Environment variables missing**: Check your `.env` file
3. **TypeScript compilation errors**: Run `npm run build` first
4. **Database connection**: Ensure PostgreSQL is running via Docker Compose

### Debug Output

- Check the **Debug Console** for runtime output
- Use the **Terminal** panel for application logs
- Monitor the **Problems** panel for TypeScript errors

### Performance

- Use `--runInBand` for test debugging (already configured)
- Set breakpoints strategically to avoid performance impact
- Use the **Call Stack** panel to understand execution flow

## 🚀 Quick Start Examples

### Debug a failing test:

1. Open the failing test file
2. Set a breakpoint at the failing assertion
3. Select "🧪 Debug Current Test File"
4. Step through the code to understand the issue

### Debug a service startup issue:

1. Set a breakpoint in the service's `main.ts`
2. Select the appropriate service debug configuration
3. Step through the bootstrap process

### Debug API endpoints:

1. Set breakpoints in controller methods
2. Start the service with debugging
3. Make API calls using Postman or curl
4. Step through the request handling

## 🔍 Advanced Debugging Tips

### Debugging Environment Issues

Use the environment validation configurations to ensure all required variables are set.

### Multi-Service Debugging

Use the "🚀 Debug All Services" compound configuration to debug interactions between services.

### Container Debugging

For production-like debugging, use the Docker configuration to attach to running containers.

### Watch Mode

Use watch mode for test-driven development with continuous debugging feedback.

---

**Note**: All debugging configurations respect the project's TypeScript setup and automatically handle module resolution and source mapping.

## 🧩 Kubernetes Pod Debugging (Attach from Host)

When running services in the local Kubernetes cluster (namespace `rbac-dev`), each deployment exposes Node inspector on port 9229 inside the pod. To attach from VS Code on your host without conflicts:

1. Ensure the latest manifests are applied (they no longer set `NODE_OPTIONS` and rely on the container command to start the inspector via Nest `--debug`).
2. For each service you want to debug, run a distinct local port-forward in a separate terminal:

- Auth Service: forward 9229 -> 9229
- API Gateway: forward 9230 -> 9229
- RBAC Core: forward 9231 -> 9229
- Audit Log Service: forward 9232 -> 9229

3. In VS Code, use the matching attach configuration:

- "Attach: auth-service (k8s)" for localhost:9229
- "Attach: api-gateway (k8s)" for localhost:9230
- "Attach: rbac-core (k8s)" for localhost:9231
- "Attach: audit-log-service (k8s)" for localhost:9232

Tips

- If you see "address already in use" inside pod logs, ensure there's no extra `NODE_OPTIONS=--inspect...` in the environment. Our manifests remove these; redeploy if needed.
- Only one inspector can bind per pod. The Nest `--debug` flag (wired via the Docker dev CMD) is the single source of truth.
- If source maps don't line up, verify `localRoot` and `remoteRoot` in the attach config map to your workspace and container (`/app`).
