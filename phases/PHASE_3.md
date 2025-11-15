# Phase 3: E2B + Docker Integration

**Duration**: 8-10 hours
**Priority**: Critical
**Risk Level**: High
**Prerequisites**: Phase 2 complete (all MCP servers functional)

## Overview

Phase 3 integrates your MCP servers into E2B (Execute to Believe) sandboxes using Docker orchestration. This provides isolated, secure execution environments for running untrusted code and API calls.

This is the highest-risk phase because it involves complex integration between E2B's cloud infrastructure and Docker containerization. However, it's also what makes Stepwise production-ready with proper isolation and scalability.

**Key Concept**: E2B sandboxes are lightweight virtual machines that can run Docker containers. We'll create a custom E2B template with Docker pre-installed, then use docker-compose to orchestrate all MCP servers within each sandbox instance.

## Objectives

1. Build E2B custom template with Docker and docker-compose pre-installed
2. Create comprehensive docker-compose.yml for orchestrating all MCP servers
3. Implement E2B sandbox lifecycle management in agent
4. Test full E2B + Docker integration end-to-end
5. Add health checks and graceful error handling
6. Optimize for speed and reliability

## Key Deliverables

### 1. E2B Custom Template
**Location**: `e2b-template/`

**Files**:
- `Dockerfile` - Template with Docker pre-installed
- `e2b.toml` - E2B configuration
- Template published to E2B cloud

### 2. Docker Compose Configuration
**Location**: Root directory

**Files**:
- `docker-compose.yml` - Development orchestration
- `docker-compose.prod.yml` - Production configuration
- `.dockerignore` - Files to exclude from builds

### 3. E2B Integration Module
**Location**: `agent/src/e2b/`

**Files**:
- `sandbox-manager.js` - Sandbox lifecycle management
- `health-checker.js` - Service health validation
- `cleanup.js` - Resource cleanup utilities

## Dependencies

- **Phase 2**: All MCP servers must be built and tested
- **Blocks Phase 4**: Agent cannot be built until E2B integration works

## Success Criteria

At the end of Phase 3, you must verify:

### E2B Template
- [ ] Template builds successfully with `e2b template build`
- [ ] Template includes Docker Engine and docker-compose
- [ ] Can create sandbox from template in <30 seconds
- [ ] Template ID saved in `.env` as `E2B_TEMPLATE_ID`

### Docker Compose
- [ ] `docker-compose up` starts all 4 MCP servers locally
- [ ] All services pass health checks
- [ ] Services can communicate over `mcp-network`
- [ ] Environment variables injected correctly

### E2B Integration
- [ ] Can create E2B sandbox programmatically
- [ ] Can upload docker-compose.yml to sandbox
- [ ] Can start all MCP servers within sandbox
- [ ] Can verify all services healthy via curl in sandbox
- [ ] Can execute commands in sandbox (e.g., call MCP tools)
- [ ] Sandbox cleanup destroys all resources

### End-to-End
- [ ] Full workflow: create sandbox → start services → make API call → cleanup works
- [ ] No resource leaks (sandboxes properly destroyed)
- [ ] Error handling gracefully handles timeouts and failures

## Detailed Implementation Steps

### Step 1: Create E2B Custom Template (2-3 hours)

E2B templates are Docker containers that define the base environment for sandboxes.

#### `e2b-template/Dockerfile`

```dockerfile
# Start with E2B base image
FROM e2b/code-interpreter:latest

# Install Docker Engine
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Install docker-compose (standalone)
RUN curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

# Verify installations
RUN docker --version && docker-compose --version

# Create working directory
WORKDIR /root

# Expose common ports for MCP servers
EXPOSE 8000 8001 8002 8003

CMD ["/bin/bash"]
```

#### `e2b-template/e2b.toml`

```toml
# E2B Template Configuration
template_id = "stepwise-debugger"
dockerfile = "Dockerfile"

[build]
# Build context
context = "."

# Build arguments (if needed)
# args = { NODE_ENV = "production" }

[sandbox]
# Default timeout for sandboxes (milliseconds)
timeout = 600000  # 10 minutes

# CPU and memory limits
cpu_count = 2
memory_mb = 4096

[metadata]
name = "Stepwise MCP Debugger"
description = "E2B template with Docker for running MCP servers"
version = "1.0.0"
```

#### Build and Publish Template (E2B v2 SDK Method)

**Note**: E2B v2 deprecates CLI-based template building. Use the SDK method instead:

```bash
cd e2b-template

# Method 1: Using E2B SDK (Recommended for v2)
# Create build_dev.py script (see example below)
python build_dev.py

# The script will output the template ID:
# Template built successfully
# Template ID: <template-id>

# Save template ID to .env
echo "E2B_TEMPLATE_ID=<template-id>" >> ../.env

# Test by creating a sandbox
e2b sandbox create --template stepwise-debugger

# Connect and verify Docker
e2b sandbox connect <sandbox-id>
docker --version
docker-compose --version
exit

# Cleanup test sandbox
e2b sandbox kill <sandbox-id>
```

**Example `build_dev.py` (E2B v2 SDK)**:
```python
import asyncio
from e2b import Sandbox
import os

async def build_template():
    # Build custom template with Dockerfile
    sandbox = await Sandbox.create(
        template='base',  # Start from base template
        timeout=600000  # 10 minutes
    )

    try:
        # Upload Dockerfile
        with open('Dockerfile', 'r') as f:
            dockerfile_content = f.read()

        await sandbox.files.write('/Dockerfile', dockerfile_content)

        # Build Docker image from Dockerfile
        result = await sandbox.commands.run(
            'cd / && docker build -t stepwise-template .',
            timeout_ms=300000
        )

        if result.exit_code != 0:
            print(f"Build failed: {result.stderr}")
            return

        print(f"Template built successfully")
        print(f"Sandbox ID: {sandbox.sandbox_id}")

    finally:
        await sandbox.kill()

asyncio.run(build_template())
```

**Legacy Method (E2B v1 CLI - deprecated)**:
```bash
# Old way (no longer recommended)
# e2b template build --name stepwise-debugger
# Use SDK method above instead
```

### Step 2: Create Docker Compose Configuration (2 hours)

#### `docker-compose.yml` (Development)

```yaml
version: '3.8'

services:
  # Gladia MCP Server - Speech-to-Text
  gladia-mcp:
    build:
      context: ./mcp-servers/gladia
      dockerfile: Dockerfile
    image: gladia-mcp:latest
    container_name: gladia-mcp
    environment:
      - GLADIA_API_KEY=${GLADIA_API_KEY}
      - PORT=8000
      - NODE_ENV=development
    ports:
      - "8000:8000"
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  # HoneyHive MCP Server - Observability
  honeyhive-mcp:
    build:
      context: ./mcp-servers/honeyhive
      dockerfile: Dockerfile
    image: honeyhive-mcp:latest
    container_name: honeyhive-mcp
    environment:
      - HONEYHIVE_API_KEY=${HONEYHIVE_API_KEY}
      - HONEYHIVE_PROJECT=${HONEYHIVE_PROJECT:-stepwise-agent}
      - PORT=8001
    ports:
      - "8001:8001"
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  # Horizon3 MCP Server - Security Scanning
  horizon3-mcp:
    build:
      context: ./mcp-servers/horizon3
      dockerfile: Dockerfile
    image: horizon3-mcp:latest
    container_name: horizon3-mcp
    environment:
      - HORIZON3_API_KEY=${HORIZON3_API_KEY}
      - HORIZON3_USE_MOCK=${HORIZON3_USE_MOCK:-true}
      - PORT=8002
      - NODE_ENV=development
    ports:
      - "8002:8002"
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

  # Custom API MCP Server - Generic HTTP Client
  custom-api-mcp:
    build:
      context: ./mcp-servers/custom-api
      dockerfile: Dockerfile
    image: custom-api-mcp:latest
    container_name: custom-api-mcp
    environment:
      - PORT=8003
      - NODE_ENV=development
    ports:
      - "8003:8003"
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8003/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

networks:
  mcp-network:
    driver: bridge
    name: stepwise-mcp-network
```

#### `docker-compose.prod.yml` (Production)

```yaml
version: '3.8'

services:
  gladia-mcp:
    image: gladia-mcp:latest
    environment:
      - GLADIA_API_KEY=${GLADIA_API_KEY}
      - PORT=8000
      - NODE_ENV=production
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  honeyhive-mcp:
    image: honeyhive-mcp:latest
    environment:
      - HONEYHIVE_API_KEY=${HONEYHIVE_API_KEY}
      - HONEYHIVE_PROJECT=${HONEYHIVE_PROJECT}
      - PORT=8001
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  horizon3-mcp:
    image: horizon3-mcp:latest
    environment:
      - HORIZON3_API_KEY=${HORIZON3_API_KEY}
      - PORT=8002
      - NODE_ENV=production
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  custom-api-mcp:
    image: custom-api-mcp:latest
    environment:
      - PORT=8003
      - NODE_ENV=production
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8003/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  mcp-network:
    driver: bridge
```

#### `.dockerignore`

```
node_modules/
__pycache__/
*.pyc
.env
.env.local
.git/
.gitignore
*.md
tests/
*.test.js
*.test.py
.vscode/
.idea/
dist/
build/
```

#### Test Docker Compose Locally

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# Should show all services "Up" and "healthy"

# Test health endpoints
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Step 3: Implement E2B Sandbox Manager (3-4 hours)

#### `agent/package.json` (add E2B dependency)

```json
{
  "name": "stepwise-agent",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@e2b/sdk": "^1.0.0",
    "dotenv": "^16.0.0"
  }
}
```

Install:
```bash
cd agent
npm install
```

#### `agent/src/e2b/sandbox-manager.js`

```javascript
import { Sandbox } from '@e2b/sdk'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class SandboxManager {
  constructor(config = {}) {
    this.config = {
      templateId: config.templateId || process.env.E2B_TEMPLATE_ID,
      timeout: config.timeout || 600000, // 10 minutes
      envVars: config.envVars || {},
      ...config
    }

    this.sandbox = null
    this.isReady = false
  }

  /**
   * Create and initialize E2B sandbox with Docker services
   */
  async initialize() {
    try {
      console.log('Creating E2B sandbox...')

      // Create sandbox from template
      this.sandbox = await Sandbox.create({
        template: this.config.templateId,
        timeoutMs: this.config.timeout,
        envVars: this.config.envVars,
        metadata: {
          project: 'stepwise',
          timestamp: new Date().toISOString()
        }
      })

      console.log(`Sandbox created: ${this.sandbox.id}`)

      // Upload docker-compose.yml
      await this.uploadDockerCompose()

      // Create .env file in sandbox
      await this.createEnvFile()

      // Start Docker services
      await this.startDockerServices()

      // Wait for services to be healthy
      await this.waitForHealthy()

      this.isReady = true
      console.log('E2B sandbox initialized and ready')

      return this.sandbox.id
    } catch (error) {
      console.error('Sandbox initialization failed:', error)
      await this.cleanup()
      throw error
    }
  }

  /**
   * Upload docker-compose.yml to sandbox
   */
  async uploadDockerCompose() {
    console.log('Uploading docker-compose.yml...')

    // Read docker-compose.prod.yml from project root
    const composePath = path.join(__dirname, '../../../docker-compose.prod.yml')
    const composeContent = fs.readFileSync(composePath, 'utf-8')

    // Write to sandbox
    await this.sandbox.files.write('/root/docker-compose.yml', composeContent)

    console.log('docker-compose.yml uploaded')
  }

  /**
   * Create .env file in sandbox with API keys
   */
  async createEnvFile() {
    console.log('Creating .env file in sandbox...')

    const envContent = `
GLADIA_API_KEY=${process.env.GLADIA_API_KEY}
HONEYHIVE_API_KEY=${process.env.HONEYHIVE_API_KEY}
HONEYHIVE_PROJECT=${process.env.HONEYHIVE_PROJECT || 'stepwise-agent'}
HORIZON3_API_KEY=${process.env.HORIZON3_API_KEY || ''}
HORIZON3_USE_MOCK=${process.env.HORIZON3_USE_MOCK || 'true'}
`.trim()

    await this.sandbox.files.write('/root/.env', envContent)

    console.log('.env file created')
  }

  /**
   * Start Docker services using docker-compose
   */
  async startDockerServices() {
    console.log('Starting Docker services...')

    // Start Docker daemon if not running
    const dockerCheck = await this.sandbox.commands.run('pgrep dockerd || dockerd &', {
      timeoutMs: 10000
    })

    // Wait for Docker daemon
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Pull images and start services
    const result = await this.sandbox.commands.run(
      'cd /root && docker-compose up -d',
      {
        timeoutMs: 180000, // 3 minutes for pulling images
        onStdout: (data) => console.log('[docker-compose]', data),
        onStderr: (data) => console.error('[docker-compose]', data)
      }
    )

    if (result.exitCode !== 0) {
      throw new Error(`docker-compose failed: ${result.stderr}`)
    }

    console.log('Docker services started')
  }

  /**
   * Wait for all services to be healthy
   */
  async waitForHealthy(maxWaitMs = 60000) {
    console.log('Waiting for services to be healthy...')

    const services = [
      { name: 'gladia-mcp', port: 8000 },
      { name: 'honeyhive-mcp', port: 8001 },
      { name: 'horizon3-mcp', port: 8002 },
      { name: 'custom-api-mcp', port: 8003 }
    ]

    const startTime = Date.now()

    for (const service of services) {
      let healthy = false

      while (!healthy && (Date.now() - startTime) < maxWaitMs) {
        try {
          const result = await this.sandbox.commands.run(
            `curl -f http://localhost:${service.port}/health`,
            { timeoutMs: 5000 }
          )

          if (result.exitCode === 0) {
            console.log(`✓ ${service.name} is healthy`)
            healthy = true
          } else {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } catch (error) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      if (!healthy) {
        throw new Error(`Service ${service.name} failed to become healthy`)
      }
    }

    console.log('All services are healthy')
  }

  /**
   * Call MCP tool in sandbox
   */
  async callTool(serverPort, toolName, params) {
    if (!this.isReady) {
      throw new Error('Sandbox not initialized')
    }

    const mcpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: params
      }
    }

    const result = await this.sandbox.commands.run(
      `curl -X POST http://localhost:${serverPort}/mcp ` +
      `-H "Content-Type: application/json" ` +
      `-d '${JSON.stringify(mcpRequest)}'`,
      { timeoutMs: 60000 }
    )

    if (result.exitCode !== 0) {
      throw new Error(`Tool call failed: ${result.stderr}`)
    }

    return JSON.parse(result.stdout)
  }

  /**
   * Get sandbox logs
   */
  async getLogs() {
    if (!this.sandbox) return null

    const result = await this.sandbox.commands.run(
      'cd /root && docker-compose logs --tail=100'
    )

    return result.stdout
  }

  /**
   * Cleanup sandbox and resources
   */
  async cleanup() {
    if (!this.sandbox) return

    try {
      console.log('Cleaning up sandbox...')

      // Stop Docker services
      await this.sandbox.commands.run(
        'cd /root && docker-compose down',
        { timeoutMs: 30000 }
      ).catch(() => {})

      // Kill sandbox
      await this.sandbox.kill()

      this.sandbox = null
      this.isReady = false

      console.log('Sandbox cleaned up')
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }

  /**
   * Get sandbox information
   */
  getInfo() {
    if (!this.sandbox) return null

    return {
      id: this.sandbox.id,
      isReady: this.isReady,
      templateId: this.config.templateId
    }
  }
}
```

#### `agent/src/e2b/health-checker.js`

```javascript
export class HealthChecker {
  constructor(sandbox) {
    this.sandbox = sandbox
  }

  async checkService(name, port) {
    try {
      const result = await this.sandbox.commands.run(
        `curl -f http://localhost:${port}/health`,
        { timeoutMs: 5000 }
      )

      return {
        service: name,
        healthy: result.exitCode === 0,
        response: result.stdout
      }
    } catch (error) {
      return {
        service: name,
        healthy: false,
        error: error.message
      }
    }
  }

  async checkAll() {
    const services = [
      { name: 'gladia-mcp', port: 8000 },
      { name: 'honeyhive-mcp', port: 8001 },
      { name: 'horizon3-mcp', port: 8002 },
      { name: 'custom-api-mcp', port: 8003 }
    ]

    const results = await Promise.all(
      services.map(s => this.checkService(s.name, s.port))
    )

    const allHealthy = results.every(r => r.healthy)

    return {
      healthy: allHealthy,
      services: results
    }
  }
}
```

### Step 4: Test E2B Integration (2-3 hours)

#### `agent/test-e2b.js`

```javascript
import dotenv from 'dotenv'
import { SandboxManager } from './src/e2b/sandbox-manager.js'
import { HealthChecker } from './src/e2b/health-checker.js'

dotenv.config()

async function testE2BIntegration() {
  console.log('=== Testing E2B + Docker Integration ===\n')

  const manager = new SandboxManager({
    templateId: process.env.E2B_TEMPLATE_ID
  })

  try {
    // Step 1: Initialize sandbox
    console.log('Step 1: Initializing sandbox...')
    await manager.initialize()
    console.log('✓ Sandbox initialized\n')

    // Step 2: Check health
    console.log('Step 2: Checking service health...')
    const checker = new HealthChecker(manager.sandbox)
    const health = await checker.checkAll()
    console.log('Health check results:', JSON.stringify(health, null, 2))
    console.log('✓ All services healthy\n')

    // Step 3: Test Gladia MCP (transcribe dummy audio)
    console.log('Step 3: Testing Gladia MCP...')
    const gladiaResult = await manager.callTool(8000, 'get_supported_languages', {})
    console.log('Gladia result:', gladiaResult)
    console.log('✓ Gladia MCP working\n')

    // Step 4: Test HoneyHive MCP (create trace)
    console.log('Step 4: Testing HoneyHive MCP...')
    const hhResult = await manager.callTool(8001, 'create_trace', {
      trace_name: 'test-trace',
      session_id: 'test-session'
    })
    console.log('HoneyHive result:', hhResult)
    console.log('✓ HoneyHive MCP working\n')

    // Step 5: Test Custom API MCP (call JSONPlaceholder)
    console.log('Step 5: Testing Custom API MCP...')
    const apiResult = await manager.callTool(8003, 'call_api', {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users/1'
    })
    console.log('API result:', apiResult.result.data)
    console.log('✓ Custom API MCP working\n')

    // Step 6: Test Horizon3 MCP (security scan)
    console.log('Step 6: Testing Horizon3 MCP...')
    const scanResult = await manager.callTool(8002, 'run_security_scan', {
      target: 'https://jsonplaceholder.typicode.com',
      scanType: 'quick'
    })
    console.log('Scan result:', scanResult)
    console.log('✓ Horizon3 MCP working\n')

    console.log('=== All Tests Passed ===')

  } catch (error) {
    console.error('Test failed:', error)
    process.exit(1)
  } finally {
    // Cleanup
    console.log('\nCleaning up...')
    await manager.cleanup()
    console.log('Done!')
  }
}

testE2BIntegration()
```

Run test:
```bash
cd agent
node test-e2b.js
```

Expected output:
```
=== Testing E2B + Docker Integration ===

Step 1: Initializing sandbox...
Creating E2B sandbox...
Sandbox created: sb_xxx
Uploading docker-compose.yml...
docker-compose.yml uploaded
Creating .env file in sandbox...
.env file created
Starting Docker services...
Docker services started
Waiting for services to be healthy...
✓ gladia-mcp is healthy
✓ honeyhive-mcp is healthy
✓ horizon3-mcp is healthy
✓ custom-api-mcp is healthy
All services are healthy
✓ Sandbox initialized

... (all tests pass)

=== All Tests Passed ===
```

## Common Pitfalls

### 1. **E2B Template Build Timeout**
- **Issue**: Template build takes >15 minutes
- **Solution**: Use smaller base image, cache layers

### 2. **Docker Daemon Not Starting in Sandbox**
- **Issue**: `dockerd` fails to start
- **Solution**: Check E2B template has Docker installed correctly

### 3. **Port Conflicts in Sandbox**
- **Issue**: Services fail to bind to ports
- **Solution**: Ensure no other processes using ports 8000-8003

### 4. **Health Checks Timing Out**
- **Issue**: Services take too long to start
- **Solution**: Increase `maxWaitMs` in `waitForHealthy()`

### 5. **Docker Compose Fails to Pull Images**
- **Issue**: Network timeout pulling images
- **Solution**: Use smaller images, increase timeout

### 6. **Sandbox Creation Fails with Quota Error**
- **Issue**: E2B account out of credits
- **Solution**: Check quota with `e2b sandbox quota`

## Optimization Tips

### 1. **Pre-build Docker Images**
Instead of building in sandbox, use pre-built images:

```yaml
# docker-compose.prod.yml
services:
  gladia-mcp:
    image: your-registry/gladia-mcp:latest  # Pull from registry
    # build: ./mcp-servers/gladia  # Don't build
```

### 2. **Cache E2B Template**
Build template once, reuse for all sandboxes:

```javascript
// Use same template ID for all sandboxes
const templateId = process.env.E2B_TEMPLATE_ID
```

### 3. **Parallel Service Startup**
Services start in parallel with docker-compose automatically

### 4. **Reduce Image Sizes**
Use alpine base images:

```dockerfile
FROM node:18-alpine  # Instead of node:18
FROM python:3.11-alpine  # Instead of python:3.11
```

## Time Breakdown

| Task | Time |
|------|------|
| Create E2B template | 2-3 hours |
| Docker Compose config | 2 hours |
| Sandbox manager | 3-4 hours |
| Integration testing | 2-3 hours |
| **TOTAL** | **8-10 hours** |

## Next Steps

Once all success criteria are met:

**[Phase 4: Agent Core Logic & Workflow Orchestration](./PHASE_4.md)**

Phase 4 will build the agent application that uses these E2B sandboxes to execute workflows.

---

**Phase 3 Complete!** You now have E2B + Docker integration working end-to-end. 🚀
