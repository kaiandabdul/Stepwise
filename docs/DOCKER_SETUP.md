# DOCKER_SETUP.md

## Containerization & Orchestration

### Table of Contents
1. [Docker Overview](#docker-overview)
2. [Individual MCP Server Dockerfiles](#individual-mcp-server-dockerfiles)
3. [docker-compose.yml Configuration](#docker-composeyml-configuration)
4. [Running Docker Compose in E2B](#running-docker-compose-in-e2b)
5. [Docker Image Optimization](#docker-image-optimization)
6. [Docker Security Best Practices](#docker-security-best-practices)
7. [Development vs Production](#development-vs-production)
8. [Troubleshooting Docker Issues](#troubleshooting-docker-issues)

---

## 1. Docker Overview

### Why Docker for This Project?

1. **Isolation**: Each MCP server runs independently
2. **Portability**: Same configuration works everywhere
3. **E2B Compatibility**: Docker containers run seamlessly in E2B sandboxes
4. **Reproducibility**: Identical environments for dev, test, and demo
5. **Hackathon-Friendly**: Judges can run with single command

### Key Concepts

- **Dockerfile**: Instructions to build a container image
- **Image**: Packaged application with dependencies
- **Container**: Running instance of an image
- **docker-compose**: Tool for defining multi-container applications
- **Networks**: Allow containers to communicate
- **Volumes**: Persistent or shared data storage

---

## 2. Individual MCP Server Dockerfiles

### 2.1 Gladia MCP Server (Node.js)

**mcp-servers/gladia/Dockerfile**:
```dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only)
RUN npm ci --production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server
CMD ["node", "server.js"]
```

**mcp-servers/gladia/.dockerignore**:
```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
*.md
Dockerfile
.dockerignore
```

### 2.2 HoneyHive MCP Server (Python)

**mcp-servers/honeyhive/Dockerfile**:
```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD python -c "import requests; requests.get('http://localhost:8001/health')" || exit 1

# Start server
CMD ["python", "server.py"]
```

**mcp-servers/honeyhive/.dockerignore**:
```
__pycache__
*.pyc
.env
.env.local
.git
.gitignore
*.md
Dockerfile
.dockerignore
.pytest_cache
```

### 2.3 Horizon3.ai MCP Server (Node.js)

**mcp-servers/horizon3/Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 8002

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:8002/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server.js"]
```

### 2.4 Custom API MCP Server (Node.js)

**mcp-servers/custom-api/Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:8003/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server.js"]
```

### 2.5 Agent Host Application (Node.js)

**agent/Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start agent
CMD ["node", "src/index.js"]
```

### 2.6 Frontend (Gradio)

**frontend/Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose Gradio default port
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import requests; requests.get('http://localhost:7860')" || exit 1

# Start Gradio app
CMD ["python", "app.py"]
```

---

## 3. docker-compose.yml Configuration

### 3.1 Complete docker-compose.yml

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  # Gladia MCP Server
  gladia-mcp:
    build:
      context: ./mcp-servers/gladia
      dockerfile: Dockerfile
    image: gladia-mcp-server:latest
    container_name: gladia-mcp
    environment:
      - GLADIA_API_KEY=${GLADIA_API_KEY}
      - PORT=8000
      - LOG_LEVEL=${LOG_LEVEL:-info}
    ports:
      - "8000:8000"
    networks:
      - mcp-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  # HoneyHive MCP Server
  honeyhive-mcp:
    build:
      context: ./mcp-servers/honeyhive
      dockerfile: Dockerfile
    image: honeyhive-mcp-server:latest
    container_name: honeyhive-mcp
    environment:
      - HONEYHIVE_API_KEY=${HONEYHIVE_API_KEY}
      - HONEYHIVE_PROJECT=${HONEYHIVE_PROJECT:-stepwise-agent}
      - PORT=8001
      - LOG_LEVEL=${LOG_LEVEL:-info}
    ports:
      - "8001:8001"
    networks:
      - mcp-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8001/health')"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  # Horizon3.ai MCP Server
  horizon3-mcp:
    build:
      context: ./mcp-servers/horizon3
      dockerfile: Dockerfile
    image: horizon3-mcp-server:latest
    container_name: horizon3-mcp
    environment:
      - HORIZON3_API_KEY=${HORIZON3_API_KEY}
      - HORIZON3_API_URL=${HORIZON3_API_URL:-https://api.horizon3.ai}
      - PORT=8002
      - LOG_LEVEL=${LOG_LEVEL:-info}
    ports:
      - "8002:8002"
    networks:
      - mcp-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8002/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  # Custom API MCP Server
  custom-api-mcp:
    build:
      context: ./mcp-servers/custom-api
      dockerfile: Dockerfile
    image: custom-api-mcp-server:latest
    container_name: custom-api-mcp
    environment:
      - PORT=8003
      - LOG_LEVEL=${LOG_LEVEL:-info}
    ports:
      - "8003:8003"
    networks:
      - mcp-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8003/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s

  # Agent Host Application
  agent:
    build:
      context: ./agent
      dockerfile: Dockerfile
    image: stepwise-agent:latest
    container_name: stepwise-agent
    environment:
      - E2B_API_KEY=${E2B_API_KEY}
      - GLADIA_API_KEY=${GLADIA_API_KEY}
      - HONEYHIVE_API_KEY=${HONEYHIVE_API_KEY}
      - HORIZON3_API_KEY=${HORIZON3_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NODE_ENV=${NODE_ENV:-production}
      - PORT=3000
      - LOG_LEVEL=${LOG_LEVEL:-info}
      # MCP Server URLs
      - GLADIA_MCP_URL=http://gladia-mcp:8000
      - HONEYHIVE_MCP_URL=http://honeyhive-mcp:8001
      - HORIZON3_MCP_URL=http://horizon3-mcp:8002
      - CUSTOM_API_MCP_URL=http://custom-api-mcp:8003
    ports:
      - "3000:3000"
    networks:
      - mcp-network
    depends_on:
      gladia-mcp:
        condition: service_healthy
      honeyhive-mcp:
        condition: service_healthy
      horizon3-mcp:
        condition: service_healthy
      custom-api-mcp:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 15s

  # Frontend (Gradio)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    image: stepwise-frontend:latest
    container_name: stepwise-frontend
    environment:
      - AGENT_URL=http://agent:3000
      - PORT=7860
    ports:
      - "7860:7860"
    networks:
      - mcp-network
    depends_on:
      agent:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:7860')"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 15s

networks:
  mcp-network:
    driver: bridge

volumes:
  agent-data:
    driver: local
```

### 3.2 Environment Variables (.env)

**.env.example**:
```bash
# E2B API Key
E2B_API_KEY=e2b_xxxxxxxxxxxxxxxxxxxxx

# Sponsor API Keys
GLADIA_API_KEY=gladia_xxxxxxxxxxxxxxxxxxxxx
HONEYHIVE_API_KEY=hh_xxxxxxxxxxxxxxxxxxxxx
HORIZON3_API_KEY=h3_xxxxxxxxxxxxxxxxxxxxx

# LLM Provider
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx

# HoneyHive Configuration
HONEYHIVE_PROJECT=stepwise-agent

# Horizon3.ai Configuration
HORIZON3_API_URL=https://api.horizon3.ai

# Application Configuration
NODE_ENV=production
LOG_LEVEL=info

# Ports (optional, defaults shown)
GLADIA_MCP_PORT=8000
HONEYHIVE_MCP_PORT=8001
HORIZON3_MCP_PORT=8002
CUSTOM_API_MCP_PORT=8003
AGENT_PORT=3000
FRONTEND_PORT=7860
```

### 3.3 Building and Running

**Build all services**:
```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build gladia-mcp

# Build with no cache
docker-compose build --no-cache
```

**Start all services**:
```bash
# Start in foreground
docker-compose up

# Start in background (detached)
docker-compose up -d

# Start specific services
docker-compose up gladia-mcp honeyhive-mcp
```

**View logs**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f agent

# Last 100 lines
docker-compose logs --tail=100 gladia-mcp
```

**Stop services**:
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop specific service
docker-compose stop agent
```

**Restart services**:
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart gladia-mcp
```

---

## 4. Running Docker Compose in E2B

### 4.1 Upload Configuration Files

```javascript
import { Sandbox } from '@e2b/sdk'
import fs from 'fs'

const sandbox = await Sandbox.create({
  envVars: {
    GLADIA_API_KEY: process.env.GLADIA_API_KEY,
    HONEYHIVE_API_KEY: process.env.HONEYHIVE_API_KEY,
    HORIZON3_API_KEY: process.env.HORIZON3_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  }
})

// Upload docker-compose.yml
const dockerCompose = fs.readFileSync('./docker-compose.yml', 'utf8')
await sandbox.files.write('/root/docker-compose.yml', dockerCompose)

// Upload .env file
const envContent = `
GLADIA_API_KEY=${process.env.GLADIA_API_KEY}
HONEYHIVE_API_KEY=${process.env.HONEYHIVE_API_KEY}
HORIZON3_API_KEY=${process.env.HORIZON3_API_KEY}
OPENAI_API_KEY=${process.env.OPENAI_API_KEY}
NODE_ENV=production
LOG_LEVEL=info
`
await sandbox.files.write('/root/.env', envContent)
```

### 4.2 Install Docker and Docker Compose

```javascript
// Install Docker
const installDocker = await sandbox.commands.run(
  'curl -fsSL https://get.docker.com | sh',
  { timeoutMs: 120000 }
)

if (installDocker.exitCode !== 0) {
  throw new Error('Docker installation failed')
}

// Install Docker Compose
const installCompose = await sandbox.commands.run(
  'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" ' +
  '-o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose',
  { timeoutMs: 60000 }
)

if (installCompose.exitCode !== 0) {
  throw new Error('Docker Compose installation failed')
}

console.log('Docker and Docker Compose installed successfully')
```

### 4.3 Start Services

```javascript
// Pull images (if pre-built)
const pull = await sandbox.commands.run(
  'cd /root && docker-compose pull',
  { timeoutMs: 300000 }  // 5 minutes
)

// Start services
const up = await sandbox.commands.run(
  'cd /root && docker-compose up -d',
  { timeoutMs: 180000 }  // 3 minutes
)

if (up.exitCode !== 0) {
  console.error('Docker Compose failed:', up.stderr)
  throw new Error('Failed to start services')
}

console.log('Services started successfully')

// Wait for services to be healthy
await new Promise(resolve => setTimeout(resolve, 30000))

// Check service status
const ps = await sandbox.commands.run('docker-compose ps')
console.log('Service status:', ps.stdout)
```

### 4.4 Health Check Function

```javascript
async function waitForServicesHealthy(sandbox, services, maxWait = 120000) {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWait) {
    const ps = await sandbox.commands.run('docker-compose ps --format json')
    const containers = JSON.parse(ps.stdout)

    const allHealthy = services.every(serviceName => {
      const container = containers.find(c => c.Service === serviceName)
      return container && container.Health === 'healthy'
    })

    if (allHealthy) {
      console.log('All services are healthy')
      return true
    }

    console.log('Waiting for services to be healthy...')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  throw new Error('Services did not become healthy in time')
}

// Usage
await waitForServicesHealthy(sandbox, [
  'gladia-mcp',
  'honeyhive-mcp',
  'horizon3-mcp',
  'custom-api-mcp',
  'agent'
])
```

---

## 5. Docker Image Optimization

### 5.1 Multi-Stage Build

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build (if using TypeScript or bundling)
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

CMD ["node", "dist/server.js"]
```

### 5.2 Layer Caching

```dockerfile
# Good: Copy package files first (cached if unchanged)
COPY package*.json ./
RUN npm ci

# Then copy source code
COPY . .

# Bad: Copy everything first
# COPY . .
# RUN npm ci
```

### 5.3 Reduce Image Size

**Use Alpine base images**:
```dockerfile
# Smaller base image
FROM node:20-alpine  # ~50MB vs node:20 ~300MB
```

**Remove unnecessary files**:
```dockerfile
# Clean up package manager cache
RUN npm ci --production && npm cache clean --force

# Remove development dependencies
RUN npm prune --production
```

**Use .dockerignore**:
```
node_modules
npm-debug.log
.git
.env
*.md
test/
coverage/
.vscode/
```

### 5.4 Image Size Comparison

```bash
# Check image sizes
docker images | grep stepwise

# Expected sizes:
# gladia-mcp-server:latest      ~80MB
# honeyhive-mcp-server:latest   ~120MB
# stepwise-agent:latest         ~90MB
# stepwise-frontend:latest      ~200MB
```

---

## 6. Docker Security Best Practices

### 6.1 Non-Root User

```dockerfile
# Create and use non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser
```

### 6.2 Read-Only Filesystem

```yaml
# docker-compose.yml
services:
  gladia-mcp:
    read_only: true
    tmpfs:
      - /tmp
      - /app/tmp
```

### 6.3 Resource Limits

```yaml
services:
  gladia-mcp:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 6.4 Security Scanning

```bash
# Scan images for vulnerabilities
docker scan gladia-mcp-server:latest

# Or use Trivy
trivy image gladia-mcp-server:latest
```

### 6.5 Network Isolation

```yaml
networks:
  mcp-internal:
    internal: true  # No external access
    driver: bridge

  mcp-external:
    driver: bridge

services:
  # MCP servers: internal only
  gladia-mcp:
    networks:
      - mcp-internal

  # Agent: both networks
  agent:
    networks:
      - mcp-internal
      - mcp-external
```

---

## 7. Development vs Production

### 7.1 docker-compose.dev.yml

```yaml
version: '3.8'

services:
  gladia-mcp:
    build:
      context: ./mcp-servers/gladia
      dockerfile: Dockerfile.dev  # Development Dockerfile
    volumes:
      # Mount source code for hot reload
      - ./mcp-servers/gladia:/app
      - /app/node_modules  # Prevent overwriting node_modules
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    command: npm run dev  # Use nodemon for auto-reload

  agent:
    build:
      context: ./agent
      dockerfile: Dockerfile.dev
    volumes:
      - ./agent:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - LOG_LEVEL=debug
    command: npm run dev
```

**Dockerfile.dev**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install  # Install all dependencies including devDependencies

COPY . .

EXPOSE 8000

# Use nodemon for hot reload
CMD ["npm", "run", "dev"]
```

**package.json**:
```json
{
  "scripts": {
    "dev": "nodemon --watch . --exec node server.js",
    "start": "node server.js"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### 7.2 Running Development Environment

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Rebuild specific service
docker-compose -f docker-compose.dev.yml up --build gladia-mcp
```

### 7.3 docker-compose.prod.yml

```yaml
version: '3.8'

services:
  gladia-mcp:
    image: gladia-mcp-server:v1.0.0  # Use specific version tag
    restart: always
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    deploy:
      replicas: 2  # Run multiple instances
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

---

## 8. Troubleshooting Docker Issues

### 8.1 Common Errors and Solutions

**Error: Port already in use**
```bash
# Find process using port 8000
lsof -i :8000

# Or on Linux
netstat -tulpn | grep 8000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "8001:8000"  # Host:Container
```

**Error: Cannot connect to Docker daemon**
```bash
# Start Docker daemon
sudo systemctl start docker

# Or on macOS
open -a Docker
```

**Error: Network not found**
```bash
# Remove all containers and recreate network
docker-compose down
docker network prune
docker-compose up
```

**Error: Volume permission denied**
```bash
# Fix permissions
sudo chown -R $USER:$USER ./data

# Or run container as current user
user: "${UID}:${GID}"
```

### 8.2 Debugging Techniques

**View container logs**:
```bash
# Real-time logs
docker-compose logs -f gladia-mcp

# Last 100 lines
docker logs --tail 100 gladia-mcp

# Since timestamp
docker logs --since 2023-01-01T00:00:00 gladia-mcp
```

**Inspect container**:
```bash
# Get detailed info
docker inspect gladia-mcp

# Get specific field
docker inspect --format='{{.State.Status}}' gladia-mcp
```

**Access container shell**:
```bash
# Access running container
docker exec -it gladia-mcp /bin/sh

# Run commands
ls -la
env | grep API_KEY
ps aux
```

**Check resource usage**:
```bash
# Monitor containers
docker stats

# Specific container
docker stats gladia-mcp
```

**Network debugging**:
```bash
# List networks
docker network ls

# Inspect network
docker network inspect mcp-network

# Test connectivity between containers
docker exec agent ping gladia-mcp

# Test from host
curl http://localhost:8000/health
```

### 8.3 Performance Issues

**Container using too much CPU/Memory**:
```yaml
# Add resource limits
services:
  gladia-mcp:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
```

**Slow startup**:
```bash
# Use multi-stage builds to reduce image size
# Pre-pull images
docker-compose pull

# Use build cache
docker-compose build --parallel
```

**Slow inter-container communication**:
```yaml
# Use custom network with specific driver
networks:
  mcp-network:
    driver: bridge
    driver_opts:
      com.docker.network.driver.mtu: 1500
```

---

## Conclusion

This Docker setup guide provides:

- ✅ Individual Dockerfiles for all MCP servers
- ✅ Complete docker-compose.yml configuration
- ✅ E2B integration patterns
- ✅ Image optimization techniques
- ✅ Security best practices
- ✅ Development and production configurations
- ✅ Comprehensive troubleshooting guide

**Next Steps**:
1. Create Dockerfiles for each MCP server
2. Test docker-compose locally
3. Upload to E2B sandbox and test
4. Optimize images for production
5. Proceed to FRONTEND_GUIDE.md

**Key Takeaways**:
- Use multi-stage builds for smaller images
- Always run as non-root user
- Implement health checks for reliability
- Use .dockerignore to exclude unnecessary files
- Test locally before deploying to E2B
