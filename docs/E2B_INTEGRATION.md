# E2B_INTEGRATION.md

## E2B SDK Usage & Sandbox Management

**NOTE: This guide covers E2B v2 API**. If you are using E2B v1, the following APIs have changed:
- `Sandbox()` constructor → `Sandbox.create()` (async method)
- `sandbox.write()` → `sandbox.files.write()`
- `sandbox.read()` → `sandbox.files.read()`

See [E2B v2 Migration Guide](https://e2b.dev/docs/migration) for details.

### Table of Contents
1. [E2B SDK Overview](#e2b-sdk-overview)
2. [Sandbox Lifecycle Management](#sandbox-lifecycle-management)
3. [Running Docker Containers in E2B](#running-docker-containers-in-e2b)
4. [Secret and Environment Management](#secret-and-environment-management)
5. [Filesystem Operations](#filesystem-operations)
6. [Process Execution and Monitoring](#process-execution-and-monitoring)
7. [Multi-Session Management](#multi-session-management)
8. [Error Handling and Recovery](#error-handling-and-recovery)
9. [Performance Optimization](#performance-optimization)
10. [Testing E2B Integration](#testing-e2b-integration)

---

## 1. E2B SDK Overview

### What is E2B?

**E2B (Execute to Believe)** is an open-source infrastructure for running AI-generated code in secure, isolated cloud sandboxes. It provides:

- **Cloud-based sandboxes**: Ephemeral, isolated Linux environments
- **Docker support**: Run containers within sandboxes
- **SDK for Node.js and Python**: Easy programmatic access
- **Custom templates**: Pre-configured environments
- **Network isolation**: Whitelist-based network access
- **Secure secrets management**: Runtime secret injection

### Why Use E2B for This Project?

1. **Security**: Isolate each user session in a separate sandbox
2. **Docker Integration**: Run MCP server containers seamlessly
3. **Hackathon-Friendly**: Easy for judges to run without local setup
4. **Automatic Cleanup**: Sandboxes destroyed after use
5. **Reproducibility**: Same environment every time

### Node.js vs Python SDK

| Feature | Node.js SDK | Python SDK |
|---------|-------------|------------|
| Installation | `npm install @e2b/sdk` | `pip install e2b` |
| Async Support | ✅ Native (async/await) | ✅ Native (asyncio) |
| TypeScript | ✅ Built-in types | ⚠️ Type stubs available |
| Documentation | ✅ Comprehensive | ✅ Comprehensive |
| Community | 🔥 Active | 🔥 Active |

**Recommendation**: Choose based on your agent host language. Both SDKs have feature parity.

### Installation

**Node.js** (v2 API):
```bash
npm install @e2b/sdk@latest
```

**Python** (v2 API):
```bash
pip install e2b>=0.10.0
```

### Authentication

Get your E2B API key from [https://e2b.dev](https://e2b.dev)

```bash
# Add to .env file
E2B_API_KEY=e2b_xxxxxxxxxxxxxxxxxxxxx
```

**Node.js (v2 API)**:
```javascript
import { Sandbox } from '@e2b/sdk'

// Option 1: Use environment variable (v2 API - using Sandbox.create())
const sandbox = await Sandbox.create({
  apiKey: process.env.E2B_API_KEY  // Pass explicitly for clarity
})

// Option 2: Auto-read from E2B_API_KEY environment variable
const sandbox = await Sandbox.create()
```

**Python (v2 API)**:
```python
from e2b import Sandbox

# Option 1: Use environment variable
sandbox = await Sandbox.create(api_key=os.getenv('E2B_API_KEY'))

# Option 2: Auto-read from E2B_API_KEY
sandbox = await Sandbox.create()
```

---

## 2. Sandbox Lifecycle Management

### 2.1 Creating a Sandbox

**Basic Creation (Node.js)**:
```javascript
import { Sandbox } from '@e2b/sdk'

const sandbox = await Sandbox.create()
console.log('Sandbox ID:', sandbox.sandboxId)
```

**Basic Creation (Python)**:
```python
from e2b import Sandbox

sandbox = Sandbox.create()
print(f'Sandbox ID: {sandbox.sandbox_id}')
```

### 2.2 Advanced Sandbox Configuration

**Node.js**:
```javascript
import { Sandbox } from '@e2b/sdk'

const sandbox = await Sandbox.create({
  // Custom template (optional)
  template: 'base',  // or your custom template ID

  // Timeout
  timeout: 3600000,  // 1 hour in milliseconds

  // Environment variables
  envVars: {
    GLADIA_API_KEY: process.env.GLADIA_API_KEY,
    HONEYHIVE_API_KEY: process.env.HONEYHIVE_API_KEY,
    HORIZON3_API_KEY: process.env.HORIZON3_API_KEY,
    NODE_ENV: 'production'
  },

  // Metadata for tracking
  metadata: {
    sessionId: 'user-session-123',
    userId: 'user-456',
    purpose: 'api-debugging'
  }
})
```

**Python**:
```python
from e2b import Sandbox

sandbox = Sandbox.create(
    template='base',  # or your custom template ID
    timeout=3600000,  # 1 hour in milliseconds
    env_vars={
        'GLADIA_API_KEY': os.getenv('GLADIA_API_KEY'),
        'HONEYHIVE_API_KEY': os.getenv('HONEYHIVE_API_KEY'),
        'HORIZON3_API_KEY': os.getenv('HORIZON3_API_KEY'),
        'NODE_ENV': 'production'
    },
    metadata={
        'sessionId': 'user-session-123',
        'userId': 'user-456',
        'purpose': 'api-debugging'
    }
)
```

### 2.3 Sandbox Information

**Node.js**:
```javascript
console.log('Sandbox ID:', sandbox.sandboxId)
console.log('Sandbox Host:', sandbox.getHost(3000))  // Get URL for port 3000
console.log('Upload URL:', sandbox.getHostname())
```

**Python**:
```python
print(f'Sandbox ID: {sandbox.sandbox_id}')
print(f'Sandbox Host: {sandbox.get_host(3000)}')  # Get URL for port 3000
print(f'Upload URL: {sandbox.get_hostname()}')
```

### 2.4 Extending Sandbox Timeout

**Node.js**:
```javascript
// Extend timeout by 1 hour
await sandbox.setTimeout(3600000)
```

**Python**:
```python
# Extend timeout by 1 hour
await sandbox.set_timeout(3600000)
```

### 2.5 Pausing and Resuming Sandboxes (Beta)

**Node.js**:
```javascript
// Pause sandbox (beta feature)
await Sandbox.pause(sandbox.sandboxId)

// Resume later
const resumedSandbox = await Sandbox.connect(sandbox.sandboxId)
```

**Python**:
```python
# Pause sandbox (beta feature)
await Sandbox.pause(sandbox.sandbox_id)

# Resume later
resumed_sandbox = await Sandbox.connect(sandbox.sandbox_id)
```

### 2.6 Destroying a Sandbox

**Node.js**:
```javascript
// Clean up sandbox when done
await sandbox.kill()
console.log('Sandbox destroyed')
```

**Python**:
```python
# Clean up sandbox when done
await sandbox.kill()
print('Sandbox destroyed')
```

### 2.7 Complete Lifecycle Example

**Node.js**:
```javascript
import { Sandbox } from '@e2b/sdk'

async function runWorkflow(userId, task) {
  let sandbox = null

  try {
    // Create sandbox
    console.log('Creating sandbox...')
    sandbox = await Sandbox.create({
      timeout: 1800000,  // 30 minutes
      envVars: {
        GLADIA_API_KEY: process.env.GLADIA_API_KEY
      },
      metadata: {
        userId,
        task
      }
    })
    console.log(`Sandbox created: ${sandbox.sandboxId}`)

    // Use sandbox for workflow
    const result = await executeWorkflow(sandbox, task)

    // Return results
    return {
      success: true,
      sandboxId: sandbox.sandboxId,
      result
    }

  } catch (error) {
    console.error('Workflow failed:', error)
    return {
      success: false,
      error: error.message
    }

  } finally {
    // Always clean up
    if (sandbox) {
      try {
        await sandbox.kill()
        console.log('Sandbox cleaned up')
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError)
      }
    }
  }
}
```

**Python**:
```python
from e2b import Sandbox

async def run_workflow(user_id: str, task: str):
    sandbox = None

    try:
        # Create sandbox
        print('Creating sandbox...')
        sandbox = Sandbox.create(
            timeout=1800000,  # 30 minutes
            env_vars={
                'GLADIA_API_KEY': os.getenv('GLADIA_API_KEY')
            },
            metadata={
                'userId': user_id,
                'task': task
            }
        )
        print(f'Sandbox created: {sandbox.sandbox_id}')

        # Use sandbox for workflow
        result = await execute_workflow(sandbox, task)

        # Return results
        return {
            'success': True,
            'sandboxId': sandbox.sandbox_id,
            'result': result
        }

    except Exception as error:
        print(f'Workflow failed: {error}')
        return {
            'success': False,
            'error': str(error)
        }

    finally:
        # Always clean up
        if sandbox:
            try:
                await sandbox.kill()
                print('Sandbox cleaned up')
            except Exception as cleanup_error:
                print(f'Cleanup failed: {cleanup_error}')
```

---

## 3. Running Docker Containers in E2B

### 3.1 Installing Docker in Sandbox

E2B sandboxes don't have Docker pre-installed by default. You need to either:

**Option 1: Use a custom E2B template with Docker pre-installed** (recommended)
**Option 2: Install Docker at runtime** (slower)

**Installing Docker at Runtime (Node.js)**:
```javascript
// Install Docker (this takes ~30 seconds)
const installDocker = await sandbox.commands.run(`
  curl -fsSL https://get.docker.com -o get-docker.sh &&
  sh get-docker.sh &&
  rm get-docker.sh
`)

if (installDocker.exitCode !== 0) {
  throw new Error('Docker installation failed')
}

console.log('Docker installed successfully')
```

### 3.2 Running a Single Docker Container

**Node.js**:
```javascript
// Pull and run Gladia MCP server
const dockerRun = await sandbox.commands.run(
  'docker run -d --name gladia-mcp -p 8000:8000 ' +
  `-e GLADIA_API_KEY=${process.env.GLADIA_API_KEY} ` +
  'gladia-mcp-server:latest',
  { timeoutMs: 60000 }  // 60 second timeout
)

if (dockerRun.exitCode !== 0) {
  console.error('Docker run failed:', dockerRun.stderr)
  throw new Error('Failed to start Gladia MCP server')
}

console.log('Gladia MCP server started:', dockerRun.stdout)

// Wait for container to be ready
await new Promise(resolve => setTimeout(resolve, 5000))

// Check container status
const dockerPs = await sandbox.commands.run('docker ps')
console.log('Running containers:', dockerPs.stdout)
```

**Python**:
```python
# Pull and run Gladia MCP server
docker_run = await sandbox.commands.run(
    f'docker run -d --name gladia-mcp -p 8000:8000 '
    f'-e GLADIA_API_KEY={os.getenv("GLADIA_API_KEY")} '
    f'gladia-mcp-server:latest',
    timeout_ms=60000  # 60 second timeout
)

if docker_run.exit_code != 0:
    print(f'Docker run failed: {docker_run.stderr}')
    raise Exception('Failed to start Gladia MCP server')

print(f'Gladia MCP server started: {docker_run.stdout}')

# Wait for container to be ready
await asyncio.sleep(5)

# Check container status
docker_ps = await sandbox.commands.run('docker ps')
print(f'Running containers: {docker_ps.stdout}')
```

### 3.3 Running Docker Compose

**Step 1: Upload docker-compose.yml**

**Node.js**:
```javascript
const dockerComposeContent = `
version: '3.8'

services:
  gladia-mcp:
    image: gladia-mcp-server:latest
    environment:
      - GLADIA_API_KEY=\${GLADIA_API_KEY}
    ports:
      - "8000:8000"
    networks:
      - mcp-network

  honeyhive-mcp:
    image: honeyhive-mcp-server:latest
    environment:
      - HONEYHIVE_API_KEY=\${HONEYHIVE_API_KEY}
    ports:
      - "8001:8000"
    networks:
      - mcp-network

  horizon3-mcp:
    image: horizon3-mcp-server:latest
    environment:
      - HORIZON3_API_KEY=\${HORIZON3_API_KEY}
    ports:
      - "8002:8000"
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
`

// Write docker-compose.yml to sandbox
await sandbox.files.write('/root/docker-compose.yml', dockerComposeContent)
console.log('docker-compose.yml uploaded')
```

**Step 2: Create .env file**

**Node.js**:
```javascript
const envContent = `
GLADIA_API_KEY=${process.env.GLADIA_API_KEY}
HONEYHIVE_API_KEY=${process.env.HONEYHIVE_API_KEY}
HORIZON3_API_KEY=${process.env.HORIZON3_API_KEY}
`

await sandbox.files.write('/root/.env', envContent)
console.log('.env file uploaded')
```

**Step 3: Start Docker Compose**

**Node.js**:
```javascript
// Install docker-compose if not available
await sandbox.commands.run(
  'curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" ' +
  '-o /usr/local/bin/docker-compose && ' +
  'chmod +x /usr/local/bin/docker-compose'
)

// Start services
const composeUp = await sandbox.commands.run(
  'cd /root && docker-compose up -d',
  { timeoutMs: 120000 }  // 2 minute timeout
)

if (composeUp.exitCode !== 0) {
  console.error('Docker compose failed:', composeUp.stderr)
  throw new Error('Failed to start Docker Compose')
}

console.log('Docker Compose started:', composeUp.stdout)

// Wait for services to be ready
await new Promise(resolve => setTimeout(resolve, 15000))

// Check service status
const composePs = await sandbox.commands.run('cd /root && docker-compose ps')
console.log('Service status:', composePs.stdout)
```

**Python**:
```python
# Upload docker-compose.yml
docker_compose_content = """
version: '3.8'

services:
  gladia-mcp:
    image: gladia-mcp-server:latest
    environment:
      - GLADIA_API_KEY=${GLADIA_API_KEY}
    ports:
      - "8000:8000"
    networks:
      - mcp-network

  honeyhive-mcp:
    image: honeyhive-mcp-server:latest
    environment:
      - HONEYHIVE_API_KEY=${HONEYHIVE_API_KEY}
    ports:
      - "8001:8000"
    networks:
      - mcp-network

  horizon3-mcp:
    image: horizon3-mcp-server:latest
    environment:
      - HORIZON3_API_KEY=${HORIZON3_API_KEY}
    ports:
      - "8002:8000"
    networks:
      - mcp-network

networks:
  mcp-network:
    driver: bridge
"""

await sandbox.files.write('/root/docker-compose.yml', docker_compose_content)
print('docker-compose.yml uploaded')

# Create .env file
env_content = f"""
GLADIA_API_KEY={os.getenv('GLADIA_API_KEY')}
HONEYHIVE_API_KEY={os.getenv('HONEYHIVE_API_KEY')}
HORIZON3_API_KEY={os.getenv('HORIZON3_API_KEY')}
"""

await sandbox.files.write('/root/.env', env_content)
print('.env file uploaded')

# Start Docker Compose
compose_up = await sandbox.commands.run(
    'cd /root && docker-compose up -d',
    timeout_ms=120000  # 2 minute timeout
)

if compose_up.exit_code != 0:
    print(f'Docker compose failed: {compose_up.stderr}')
    raise Exception('Failed to start Docker Compose')

print(f'Docker Compose started: {compose_up.stdout}')

# Wait for services
await asyncio.sleep(15)

# Check status
compose_ps = await sandbox.commands.run('cd /root && docker-compose ps')
print(f'Service status: {compose_ps.stdout}')
```

### 3.4 Health Checking Docker Containers

**Node.js**:
```javascript
async function waitForContainerHealth(sandbox, containerName, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    const health = await sandbox.commands.run(
      `docker inspect --format='{{.State.Health.Status}}' ${containerName}`
    )

    if (health.stdout.trim() === 'healthy') {
      console.log(`${containerName} is healthy`)
      return true
    }

    console.log(`${containerName} not ready yet, retrying... (${i + 1}/${maxRetries})`)
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  throw new Error(`${containerName} did not become healthy`)
}

// Usage
await waitForContainerHealth(sandbox, 'gladia-mcp')
```

### 3.5 Accessing Container Logs

**Node.js**:
```javascript
// Get logs from a container
const logs = await sandbox.commands.run('docker logs gladia-mcp')
console.log('Gladia MCP logs:', logs.stdout)

// Follow logs in real-time (background process)
const logStream = await sandbox.commands.run(
  'docker logs -f gladia-mcp',
  {
    background: true,
    onStdout: (data) => console.log('[Gladia]', data),
    onStderr: (data) => console.error('[Gladia Error]', data)
  }
)
```

### 3.6 Stopping and Removing Containers

**Node.js**:
```javascript
// Stop Docker Compose services
await sandbox.commands.run('cd /root && docker-compose down')

// Or stop individual container
await sandbox.commands.run('docker stop gladia-mcp')
await sandbox.commands.run('docker rm gladia-mcp')

// Clean up all containers (nuclear option)
await sandbox.commands.run('docker rm -f $(docker ps -aq)')
```

---

## 4. Secret and Environment Management

### 4.1 Injecting Secrets at Sandbox Creation

**Node.js**:
```javascript
const sandbox = await Sandbox.create({
  envVars: {
    // Sponsor API keys
    GLADIA_API_KEY: process.env.GLADIA_API_KEY,
    HONEYHIVE_API_KEY: process.env.HONEYHIVE_API_KEY,
    HORIZON3_API_KEY: process.env.HORIZON3_API_KEY,

    // LLM API key
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,

    // Application config
    NODE_ENV: 'production',
    LOG_LEVEL: 'info'
  }
})
```

### 4.2 Validating Secrets Before Injection

**Node.js**:
```javascript
function validateSecrets() {
  const required = [
    'E2B_API_KEY',
    'GLADIA_API_KEY',
    'HONEYHIVE_API_KEY',
    'HORIZON3_API_KEY'
  ]

  const missing = required.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required secrets: ${missing.join(', ')}`)
  }

  // Validate format
  if (!process.env.E2B_API_KEY.startsWith('e2b_')) {
    throw new Error('Invalid E2B_API_KEY format')
  }

  console.log('All secrets validated ✓')
}

validateSecrets()
```

### 4.3 Secrets in Docker Containers

**Option 1: Pass via Environment Variables**:
```javascript
await sandbox.commands.run(
  `docker run -d ` +
  `-e GLADIA_API_KEY=${process.env.GLADIA_API_KEY} ` +
  `gladia-mcp-server:latest`
)
```

**Option 2: Use .env file with Docker Compose** (shown in section 3.3)

**Option 3: Docker Secrets (more secure)**:
```javascript
// Create Docker secret
await sandbox.commands.run(
  `echo ${process.env.GLADIA_API_KEY} | docker secret create gladia_api_key -`
)

// Use in service
await sandbox.commands.run(
  'docker service create --name gladia-mcp --secret gladia_api_key gladia-mcp-server:latest'
)
```

### 4.4 Secret Rotation

**Node.js**:
```javascript
async function rotateSecrets(sandbox, newSecrets) {
  // Stop containers
  await sandbox.commands.run('docker-compose down')

  // Update .env file
  const newEnvContent = Object.entries(newSecrets)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  await sandbox.files.write('/root/.env', newEnvContent)

  // Restart containers
  await sandbox.commands.run('docker-compose up -d')

  console.log('Secrets rotated successfully')
}
```

### 4.5 Redacting Secrets from Logs

**Node.js**:
```javascript
function redactSecrets(logMessage) {
  let redacted = logMessage

  // Redact API keys
  const apiKeyPattern = /([a-z]+_)?[a-zA-Z0-9]{32,}/g
  redacted = redacted.replace(apiKeyPattern, '[REDACTED_API_KEY]')

  // Redact Bearer tokens
  const bearerPattern = /Bearer\s+[a-zA-Z0-9._-]+/gi
  redacted = redacted.replace(bearerPattern, 'Bearer [REDACTED]')

  return redacted
}

// Usage
const logs = await sandbox.commands.run('docker logs gladia-mcp')
console.log(redactSecrets(logs.stdout))
```

---

## 5. Filesystem Operations (v2 API)

**E2B v2 Update**: All file operations now use `sandbox.files.*` namespace.

### 5.1 Writing Files

**Node.js (v2 API)**:
```javascript
// Write text file (v2 API - using sandbox.files.write())
await sandbox.files.write('/app/config.json', JSON.stringify({
  mode: 'production',
  debug: false
}, null, 2))

// Write binary file (e.g., audio file)
const audioBuffer = fs.readFileSync('./sample.mp3')
await sandbox.files.write('/tmp/sample.mp3', audioBuffer)
```

**Python (v2 API)**:
```python
# Write text file (v2 API - using sandbox.files.write())
await sandbox.files.write('/app/config.json', json.dumps({
    'mode': 'production',
    'debug': False
}, indent=2))

# Write binary file
with open('./sample.mp3', 'rb') as f:
    audio_data = f.read()
await sandbox.files.write('/tmp/sample.mp3', audio_data)
```

### 5.2 Reading Files

**Node.js (v2 API)**:
```javascript
// Read text file (v2 API - using sandbox.files.read())
const configContent = await sandbox.files.read('/app/config.json')
const config = JSON.parse(configContent)

// Read binary file
const audioBuffer = await sandbox.files.read('/tmp/sample.mp3', { encoding: 'binary' })
```

**Python (v2 API)**:
```python
# Read text file (v2 API - using sandbox.files.read())
config_content = await sandbox.files.read('/app/config.json')
config = json.loads(config_content)

# Read binary file
audio_data = await sandbox.files.read('/tmp/sample.mp3', encoding='binary')
```

### 5.3 Listing Files

**Node.js**:
```javascript
// List files in directory
const files = await sandbox.files.list('/app')
console.log('Files:', files)

// Recursive listing
const allFiles = await sandbox.commands.run('find /app -type f')
console.log('All files:', allFiles.stdout)
```

### 5.4 Deleting Files

**Node.js**:
```javascript
// Delete single file
await sandbox.files.remove('/tmp/sample.mp3')

// Delete directory
await sandbox.commands.run('rm -rf /tmp/session-data')
```

### 5.5 File Permissions

**Node.js**:
```javascript
// Make file executable
await sandbox.commands.run('chmod +x /app/script.sh')

// Change ownership
await sandbox.commands.run('chown appuser:appgroup /app/data')

// Set read-only
await sandbox.commands.run('chmod 444 /app/config.json')
```

### 5.6 Uploading Large Files

**Node.js**:
```javascript
// For files < 10MB, use files.write()
// For larger files, use chunked upload

async function uploadLargeFile(sandbox, localPath, remotePath) {
  const fileBuffer = fs.readFileSync(localPath)
  const chunkSize = 5 * 1024 * 1024  // 5MB chunks

  for (let i = 0; i < fileBuffer.length; i += chunkSize) {
    const chunk = fileBuffer.slice(i, i + chunkSize)
    const isFirst = i === 0
    const mode = isFirst ? 'w' : 'a'  // write or append

    await sandbox.commands.run(
      `cat >> ${remotePath}`,
      { stdin: chunk }
    )
  }

  console.log(`Uploaded ${localPath} to ${remotePath}`)
}
```

---

## 6. Process Execution and Monitoring

### 6.1 Running Commands

**Node.js**:
```javascript
// Simple command
const result = await sandbox.commands.run('ls -la /app')
console.log('Exit code:', result.exitCode)
console.log('Output:', result.stdout)
console.log('Errors:', result.stderr)
```

**Python**:
```python
# Simple command
result = await sandbox.commands.run('ls -la /app')
print(f'Exit code: {result.exit_code}')
print(f'Output: {result.stdout}')
print(f'Errors: {result.stderr}')
```

### 6.2 Running Commands with Timeout

**Node.js**:
```javascript
try {
  const result = await sandbox.commands.run(
    'sleep 60',
    { timeoutMs: 5000 }  // 5 second timeout
  )
} catch (error) {
  console.error('Command timed out:', error)
}
```

### 6.3 Background Processes

**Node.js**:
```javascript
// Start background process
const process = await sandbox.commands.run(
  'python api_server.py',
  {
    background: true,
    onStdout: (data) => console.log('[API Server]', data),
    onStderr: (data) => console.error('[API Server Error]', data)
  }
)

console.log('Process ID:', process.pid)

// Later: kill process
await sandbox.commands.run(`kill ${process.pid}`)
```

### 6.4 Streaming Output

**Node.js**:
```javascript
// Stream output in real-time
const process = await sandbox.commands.run(
  'docker-compose up',
  {
    onStdout: (line) => {
      console.log('[Docker]', line)
      // Could also send to websocket for frontend
    },
    onStderr: (line) => {
      console.error('[Docker Error]', line)
    }
  }
)
```

### 6.5 Piping Commands

**Node.js**:
```javascript
// Pipe commands using shell
const result = await sandbox.commands.run(
  'cat /app/data.json | jq .users | wc -l'
)
console.log('Number of users:', result.stdout.trim())
```

### 6.6 Environment Variables for Commands

**Node.js**:
```javascript
// Set environment variable for single command
const result = await sandbox.commands.run(
  'node script.js',
  {
    env: {
      DEBUG: 'true',
      API_URL: 'https://api.example.com'
    }
  }
)
```

---

## 7. Multi-Session Management

### 7.1 Session Manager Class

**Node.js**:
```javascript
class E2BSessionManager {
  constructor() {
    this.sessions = new Map()  // sessionId -> sandbox
  }

  async createSession(sessionId, userId, config = {}) {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`)
    }

    const sandbox = await Sandbox.create({
      timeout: config.timeout || 1800000,  // 30 minutes default
      envVars: config.envVars || {},
      metadata: {
        sessionId,
        userId,
        createdAt: new Date().toISOString()
      }
    })

    this.sessions.set(sessionId, {
      sandbox,
      userId,
      createdAt: Date.now()
    })

    console.log(`Session ${sessionId} created for user ${userId}`)
    return sandbox
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }
    return session.sandbox
  }

  async destroySession(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.warn(`Session ${sessionId} not found`)
      return
    }

    try {
      await session.sandbox.kill()
      this.sessions.delete(sessionId)
      console.log(`Session ${sessionId} destroyed`)
    } catch (error) {
      console.error(`Failed to destroy session ${sessionId}:`, error)
    }
  }

  async cleanupExpiredSessions(maxAgeMs = 3600000) {
    const now = Date.now()
    const expired = []

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt > maxAgeMs) {
        expired.push(sessionId)
      }
    }

    for (const sessionId of expired) {
      await this.destroySession(sessionId)
    }

    console.log(`Cleaned up ${expired.length} expired sessions`)
  }

  async destroyAllSessions() {
    const sessionIds = Array.from(this.sessions.keys())
    await Promise.all(sessionIds.map(id => this.destroySession(id)))
    console.log('All sessions destroyed')
  }
}

// Usage
const sessionManager = new E2BSessionManager()

// Create session
const sandbox = await sessionManager.createSession('user-123-session-1', 'user-123', {
  envVars: {
    GLADIA_API_KEY: process.env.GLADIA_API_KEY
  }
})

// Get session
const existingSandbox = sessionManager.getSession('user-123-session-1')

// Cleanup
await sessionManager.destroySession('user-123-session-1')

// Periodic cleanup
setInterval(() => {
  sessionManager.cleanupExpiredSessions()
}, 300000)  // Every 5 minutes
```

### 7.2 Sandbox Pooling (Advanced)

**Node.js**:
```javascript
class SandboxPool {
  constructor(poolSize = 3) {
    this.poolSize = poolSize
    this.available = []
    this.inUse = new Map()
    this.warming = false
  }

  async init() {
    console.log(`Warming pool with ${this.poolSize} sandboxes...`)
    await this.warmPool()
    console.log('Pool ready')
  }

  async warmPool() {
    if (this.warming) return
    this.warming = true

    try {
      while (this.available.length < this.poolSize) {
        const sandbox = await Sandbox.create({
          timeout: 7200000  // 2 hours
        })
        this.available.push(sandbox)
        console.log(`Added sandbox to pool (${this.available.length}/${this.poolSize})`)
      }
    } finally {
      this.warming = false
    }
  }

  async acquire(sessionId) {
    // Get from pool or create new
    let sandbox

    if (this.available.length > 0) {
      sandbox = this.available.pop()
      console.log(`Acquired sandbox from pool for session ${sessionId}`)
    } else {
      console.log(`Pool empty, creating new sandbox for session ${sessionId}`)
      sandbox = await Sandbox.create()
    }

    this.inUse.set(sessionId, sandbox)

    // Refill pool asynchronously
    this.warmPool()

    return sandbox
  }

  async release(sessionId) {
    const sandbox = this.inUse.get(sessionId)
    if (!sandbox) {
      console.warn(`Session ${sessionId} not found in pool`)
      return
    }

    this.inUse.delete(sessionId)

    // Option 1: Return to pool (reuse sandbox)
    // this.available.push(sandbox)

    // Option 2: Destroy and create fresh (more secure)
    await sandbox.kill()
    this.warmPool()

    console.log(`Released sandbox for session ${sessionId}`)
  }

  async shutdown() {
    console.log('Shutting down pool...')

    // Destroy all available sandboxes
    await Promise.all(this.available.map(s => s.kill()))

    // Destroy all in-use sandboxes
    await Promise.all(Array.from(this.inUse.values()).map(s => s.kill()))

    this.available = []
    this.inUse.clear()

    console.log('Pool shut down')
  }
}

// Usage
const pool = new SandboxPool(5)
await pool.init()

// Acquire sandbox
const sandbox = await pool.acquire('session-123')

// Use sandbox
// ...

// Release back to pool
await pool.release('session-123')

// Cleanup on shutdown
process.on('SIGINT', async () => {
  await pool.shutdown()
  process.exit()
})
```

---

## 8. Error Handling and Recovery

### 8.1 Common E2B Errors

**Sandbox Creation Failures**:
```javascript
async function createSandboxWithRetry(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const sandbox = await Sandbox.create()
      console.log('Sandbox created successfully')
      return sandbox

    } catch (error) {
      console.error(`Sandbox creation attempt ${attempt} failed:`, error.message)

      if (attempt === maxRetries) {
        throw new Error(`Failed to create sandbox after ${maxRetries} attempts`)
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000
      console.log(`Retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

**Timeout Errors**:
```javascript
async function executeWithTimeout(sandbox, command, timeoutMs = 60000) {
  try {
    const result = await sandbox.commands.run(command, { timeoutMs })
    return result

  } catch (error) {
    if (error.message.includes('timeout')) {
      console.error(`Command timed out after ${timeoutMs}ms`)
      // Try to kill the process
      await sandbox.commands.run('pkill -9 -f "' + command + '"')
    }
    throw error
  }
}
```

**Network Connectivity Issues**:
```javascript
async function checkSandboxConnectivity(sandbox) {
  try {
    // Ping a reliable host
    const ping = await sandbox.commands.run('ping -c 1 8.8.8.8', { timeoutMs: 5000 })

    if (ping.exitCode === 0) {
      console.log('Sandbox has network connectivity')
      return true
    } else {
      console.error('Sandbox network check failed')
      return false
    }

  } catch (error) {
    console.error('Network connectivity check error:', error)
    return false
  }
}
```

### 8.2 Graceful Degradation

**Node.js**:
```javascript
async function executeWorkflowSafely(sandbox, workflow) {
  const results = {
    success: [],
    failed: [],
    skipped: []
  }

  for (const step of workflow.steps) {
    try {
      const result = await executeStep(sandbox, step)
      results.success.push({ step: step.name, result })

    } catch (error) {
      console.error(`Step ${step.name} failed:`, error)
      results.failed.push({ step: step.name, error: error.message })

      // Check if step is optional
      if (step.optional) {
        console.log(`Step ${step.name} is optional, continuing...`)
        continue
      }

      // Check if there's a fallback
      if (step.fallback) {
        try {
          const fallbackResult = await executeStep(sandbox, step.fallback)
          results.success.push({ step: step.fallback.name, result: fallbackResult })
          continue
        } catch (fallbackError) {
          console.error(`Fallback also failed:`, fallbackError)
        }
      }

      // Critical step failed, skip remaining steps
      console.error(`Critical step ${step.name} failed, aborting workflow`)
      results.skipped = workflow.steps.slice(workflow.steps.indexOf(step) + 1)
      break
    }
  }

  return results
}
```

### 8.3 Logging and Debugging

**Node.js**:
```javascript
class E2BLogger {
  constructor(sessionId) {
    this.sessionId = sessionId
    this.logs = []
  }

  log(level, message, metadata = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level,
      message,
      metadata
    }

    this.logs.push(entry)
    console.log(`[${level.toUpperCase()}] [${this.sessionId}]`, message, metadata)
  }

  info(message, metadata) {
    this.log('info', message, metadata)
  }

  error(message, metadata) {
    this.log('error', message, metadata)
  }

  debug(message, metadata) {
    this.log('debug', message, metadata)
  }

  getLogs() {
    return this.logs
  }
}

// Usage
const logger = new E2BLogger('session-123')

logger.info('Creating sandbox')
const sandbox = await Sandbox.create()
logger.info('Sandbox created', { sandboxId: sandbox.sandboxId })

try {
  const result = await sandbox.commands.run('ls -la')
  logger.debug('Command executed', { exitCode: result.exitCode })
} catch (error) {
  logger.error('Command failed', { error: error.message })
}
```

---

## 9. Performance Optimization

### 9.1 Custom E2B Templates

Create a custom template with Docker and dependencies pre-installed to reduce startup time.

**Step 1: Create Dockerfile**:
```dockerfile
# e2b-template/Dockerfile
FROM ubuntu:22.04

# Install Docker
RUN apt-get update && \
    apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release && \
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Install Node.js (if needed)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# Pull Docker images
RUN docker pull gladia-mcp-server:latest && \
    docker pull honeyhive-mcp-server:latest && \
    docker pull horizon3-mcp-server:latest

# Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*
```

**Step 2: Build and Publish Template**:
```bash
# Install E2B CLI
npm install -g @e2b/cli

# Login
e2b login

# Initialize template
e2b template init

# Build template
e2b template build --dockerfile e2b-template/Dockerfile

# Get template ID
e2b template list
```

**Step 3: Use Custom Template**:
```javascript
const sandbox = await Sandbox.create({
  template: 'your-custom-template-id'  // Much faster startup!
})
```

### 9.2 Caching Strategy

**Node.js**:
```javascript
class SandboxCache {
  constructor(ttlMs = 300000) {  // 5 minutes default
    this.cache = new Map()
    this.ttlMs = ttlMs
  }

  async get(key, factory) {
    const cached = this.cache.get(key)

    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      console.log(`Cache hit for ${key}`)
      return cached.value
    }

    console.log(`Cache miss for ${key}, fetching...`)
    const value = await factory()

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    })

    return value
  }

  clear() {
    this.cache.clear()
  }
}

// Usage
const cache = new SandboxCache()

const result = await cache.get('docker-ps', async () => {
  return await sandbox.commands.run('docker ps')
})
```

### 9.3 Parallel Operations

**Node.js**:
```javascript
// Bad: Sequential execution
const result1 = await sandbox.commands.run('docker pull image1')
const result2 = await sandbox.commands.run('docker pull image2')
const result3 = await sandbox.commands.run('docker pull image3')

// Good: Parallel execution
const [result1, result2, result3] = await Promise.all([
  sandbox.commands.run('docker pull image1'),
  sandbox.commands.run('docker pull image2'),
  sandbox.commands.run('docker pull image3')
])
```

### 9.4 Resource Monitoring

**Node.js**:
```javascript
async function monitorSandboxResources(sandbox) {
  const metrics = {}

  // CPU usage
  const cpuResult = await sandbox.commands.run('top -bn1 | grep "Cpu(s)"')
  metrics.cpu = cpuResult.stdout

  // Memory usage
  const memResult = await sandbox.commands.run('free -m')
  metrics.memory = memResult.stdout

  // Disk usage
  const diskResult = await sandbox.commands.run('df -h')
  metrics.disk = diskResult.stdout

  // Docker stats
  const dockerResult = await sandbox.commands.run('docker stats --no-stream')
  metrics.docker = dockerResult.stdout

  return metrics
}

// Monitor periodically
setInterval(async () => {
  const metrics = await monitorSandboxResources(sandbox)
  console.log('Resource metrics:', metrics)
}, 60000)  // Every minute
```

---

## 10. Testing E2B Integration

### 10.1 Unit Tests

**Node.js (Jest)**:
```javascript
// __tests__/e2b-integration.test.js
import { Sandbox } from '@e2b/sdk'

describe('E2B Sandbox Integration', () => {
  let sandbox

  beforeEach(async () => {
    sandbox = await Sandbox.create()
  })

  afterEach(async () => {
    if (sandbox) {
      await sandbox.kill()
    }
  })

  test('should create sandbox successfully', () => {
    expect(sandbox.sandboxId).toBeDefined()
  })

  test('should run simple command', async () => {
    const result = await sandbox.commands.run('echo "Hello E2B"')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Hello E2B')
  })

  test('should write and read file', async () => {
    const content = 'Test content'
    await sandbox.files.write('/tmp/test.txt', content)
    const read = await sandbox.files.read('/tmp/test.txt')
    expect(read).toBe(content)
  })

  test('should handle command timeout', async () => {
    await expect(
      sandbox.commands.run('sleep 10', { timeoutMs: 1000 })
    ).rejects.toThrow()
  })
})
```

### 10.2 Integration Tests

**Node.js**:
```javascript
// __tests__/docker-integration.test.js
describe('Docker in E2B Integration', () => {
  let sandbox

  beforeAll(async () => {
    sandbox = await Sandbox.create({ timeout: 300000 })

    // Install Docker
    await sandbox.commands.run(
      'curl -fsSL https://get.docker.com | sh',
      { timeoutMs: 120000 }
    )
  })

  afterAll(async () => {
    await sandbox.kill()
  })

  test('should run Docker container', async () => {
    const result = await sandbox.commands.run('docker run hello-world')
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('Hello from Docker!')
  })

  test('should run docker-compose', async () => {
    // Upload docker-compose.yml
    const composeContent = `
version: '3.8'
services:
  test:
    image: nginx:alpine
    ports:
      - "8080:80"
`
    await sandbox.files.write('/root/docker-compose.yml', composeContent)

    // Start services
    const result = await sandbox.commands.run(
      'cd /root && docker-compose up -d',
      { timeoutMs: 60000 }
    )

    expect(result.exitCode).toBe(0)

    // Verify service is running
    const ps = await sandbox.commands.run('docker-compose ps')
    expect(ps.stdout).toContain('test')
  })
})
```

### 10.3 End-to-End Tests

**Node.js**:
```javascript
// __tests__/e2e.test.js
describe('Complete Workflow E2E Test', () => {
  test('should run complete MCP workflow in E2B', async () => {
    const sandbox = await Sandbox.create({
      envVars: {
        GLADIA_API_KEY: process.env.GLADIA_API_KEY
      }
    })

    try {
      // 1. Upload docker-compose.yml
      await sandbox.files.write('/root/docker-compose.yml', dockerComposeContent)

      // 2. Start MCP servers
      await sandbox.commands.run('docker-compose up -d', { timeoutMs: 120000 })

      // 3. Wait for services
      await new Promise(resolve => setTimeout(resolve, 15000))

      // 4. Test MCP server health
      const health = await sandbox.commands.run('curl http://localhost:8000/health')
      expect(health.exitCode).toBe(0)

      // 5. Execute workflow
      const workflow = await executeWorkflow(sandbox, 'Test API')
      expect(workflow.success).toBe(true)

    } finally {
      await sandbox.kill()
    }
  }, 300000)  // 5 minute timeout
})
```

### 10.4 Performance Benchmarks

**Node.js**:
```javascript
// __tests__/performance.test.js
describe('E2B Performance Benchmarks', () => {
  test('sandbox creation time', async () => {
    const start = Date.now()
    const sandbox = await Sandbox.create()
    const duration = Date.now() - start

    console.log(`Sandbox creation took ${duration}ms`)
    expect(duration).toBeLessThan(15000)  // Should be < 15 seconds

    await sandbox.kill()
  })

  test('docker container startup time', async () => {
    const sandbox = await Sandbox.create()

    const start = Date.now()
    await sandbox.commands.run('docker run -d nginx:alpine')
    const duration = Date.now() - start

    console.log(`Docker container startup took ${duration}ms`)
    expect(duration).toBeLessThan(30000)  // Should be < 30 seconds

    await sandbox.kill()
  })
})
```

---

## Conclusion

This E2B integration guide provides comprehensive coverage of:

- ✅ Sandbox lifecycle management
- ✅ Docker and Docker Compose orchestration
- ✅ Secrets and environment management
- ✅ Filesystem and process operations
- ✅ Multi-session management with pooling
- ✅ Error handling and recovery
- ✅ Performance optimization
- ✅ Testing strategies

**Next Steps**:
1. Set up E2B account and get API key
2. Create custom E2B template with Docker pre-installed
3. Implement `SandboxManager` class for session management
4. Test Docker Compose setup locally
5. Proceed to MCP_SERVERS.md for sponsor tool integration

**Key Takeaways**:
- Always use try-finally for sandbox cleanup
- Pre-warm sandboxes for better performance
- Use custom templates to reduce startup time
- Monitor resources and set appropriate timeouts
- Test thoroughly with integration tests
