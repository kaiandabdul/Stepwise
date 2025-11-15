# Development Workflow Guide

Complete guide for local development, testing, debugging, and deployment of the Stepwise Live API Debugger Agent.

## Table of Contents
- [Development Environment Setup](#development-environment-setup)
- [Local Development](#local-development)
- [Testing Strategies](#testing-strategies)
- [Debugging Techniques](#debugging-techniques)
- [Git Workflow](#git-workflow)
- [Code Quality](#code-quality)
- [Hackathon Demo Deployment](#hackathon-demo-deployment)
- [Demo Script](#demo-script)
- [Troubleshooting](#troubleshooting)

---

## Development Environment Setup

### Prerequisites

**Required:**
- Node.js 18+ or Python 3.9+
- Docker Desktop 4.25+
- Docker Compose 2.0+
- Git 2.30+
- E2B CLI
- Text editor (VS Code recommended)

**Optional:**
- ngrok (for webhook testing)
- Postman/Insomnia (for API testing)
- MCP Inspector (for MCP debugging)

### Initial Setup

**1. Install E2B CLI**

```bash
npm install -g @e2b/cli
# or
pip install e2b-cli

# Authenticate
e2b auth login
```

**2. Clone and Install Dependencies**

```bash
git clone <your-repo-url>
cd Stepwise

# Install agent dependencies
cd agent
npm install  # or pip install -r requirements.txt

# Install MCP server dependencies
cd ../mcp-servers/gladia
npm install  # or pip install -r requirements.txt

cd ../honeyhive
npm install

cd ../horizon3
npm install

cd ../custom-api
npm install

cd ../..
```

**3. Configure Environment Variables**

```bash
# Copy template
cp .env.example .env

# Edit .env with your API keys
nano .env
```

Required secrets:
```env
# E2B
E2B_API_KEY=your_e2b_api_key

# Sponsor APIs
GLADIA_API_KEY=your_gladia_key
HONEYHIVE_API_KEY=your_honeyhive_key
HORIZON3_API_KEY=your_horizon3_key

# LLM (Vercel AI Gateway)
AI_GATEWAY_API_KEY=your_ai_gateway_key

# Application
NODE_ENV=development
LOG_LEVEL=debug
```

**4. Build Docker Images**

```bash
docker-compose build
```

**5. Verify Installation**

```bash
# Test E2B connection
e2b sandbox create

# Test Docker
docker ps

# Test MCP servers locally
cd mcp-servers/gladia
npm start  # Should start on port 8000

# In another terminal
curl http://localhost:8000/health
```

---

## Local Development

### Development Without E2B

For faster iteration, run MCP servers locally without E2B sandboxes:

**Terminal 1: Gladia MCP Server**
```bash
cd mcp-servers/gladia
GLADIA_API_KEY=xxx npm run dev
```

**Terminal 2: HoneyHive MCP Server**
```bash
cd mcp-servers/honeyhive
HONEYHIVE_API_KEY=xxx npm run dev
```

**Terminal 3: Horizon3 MCP Server**
```bash
cd mcp-servers/horizon3
HORIZON3_API_KEY=xxx npm run dev
```

**Terminal 4: Agent Application**
```bash
cd agent
# Configure to use local MCP servers
export GLADIA_MCP_URL=http://localhost:8000
export HONEYHIVE_MCP_URL=http://localhost:8001
export HORIZON3_MCP_URL=http://localhost:8002
export USE_E2B=false

npm run dev
```

**Terminal 5: Frontend**
```bash
cd frontend
python app.py
# Visit http://localhost:7860
```

### Development With E2B (Full Integration)

For testing the complete E2B + Docker integration:

**1. Create E2B Template (One-time)**

```bash
cd e2b-template
e2b template build --name stepwise-debugger

# Note the template ID
export E2B_TEMPLATE_ID=<template-id>
```

**2. Run Agent with E2B**

```javascript
// agent/src/index.js
import { Sandbox } from '@e2b/sdk'

const sandbox = await Sandbox.create({
  template: process.env.E2B_TEMPLATE_ID,
  timeoutMs: 600000, // 10 minutes for dev
  envVars: {
    GLADIA_API_KEY: process.env.GLADIA_API_KEY,
    HONEYHIVE_API_KEY: process.env.HONEYHIVE_API_KEY,
    HORIZON3_API_KEY: process.env.HORIZON3_API_KEY
  }
})

// Upload docker-compose.yml
await sandbox.files.write('/root/docker-compose.yml', dockerComposeContent)

// Start MCP servers
const startResult = await sandbox.commands.run(
  'cd /root && docker-compose up -d',
  { timeoutMs: 180000 }
)

// Wait for health checks
await sandbox.commands.run(
  'timeout 60 bash -c "until curl -f http://localhost:8000/health; do sleep 2; done"'
)
```

### Hot Reload Setup

**Node.js with nodemon:**

```json
// package.json
{
  "scripts": {
    "dev": "nodemon --watch src --exec node src/index.js"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

**Python with watchdog:**

```python
# dev.py
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import subprocess
import sys

class RestartHandler(FileSystemEventHandler):
    def __init__(self):
        self.process = None
        self.restart()

    def on_modified(self, event):
        if event.src_path.endswith('.py'):
            print(f"Change detected in {event.src_path}, restarting...")
            self.restart()

    def restart(self):
        if self.process:
            self.process.terminate()
        self.process = subprocess.Popen([sys.executable, 'app.py'])

if __name__ == "__main__":
    handler = RestartHandler()
    observer = Observer()
    observer.schedule(handler, path='./src', recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        handler.process.terminate()
    observer.join()
```

---

## Testing Strategies

### Unit Tests

**Testing MCP Tools**

```javascript
// mcp-servers/gladia/tests/tools.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { transcribeAudio } from '../src/tools.js'

describe('Gladia MCP Tools', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should transcribe audio successfully', async () => {
    // Mock Gladia API
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transcription: 'Hello world',
        language: 'en',
        confidence: 0.95
      })
    })

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/audio.mp3',
      language: 'en'
    })

    expect(result.success).toBe(true)
    expect(result.transcription).toBe('Hello world')
    expect(fetch).toHaveBeenCalledWith(
      'https://api.gladia.io/v2/transcription',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Gladia-Key': expect.any(String)
        })
      })
    )
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized'
    })

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/audio.mp3'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('401')
  })
})
```

**Testing Agent Logic**

```javascript
// agent/tests/planner.test.js
import { describe, it, expect } from 'vitest'
import { WorkflowPlanner } from '../src/planner.js'

describe('WorkflowPlanner', () => {
  it('should generate correct workflow for voice input', async () => {
    const planner = new WorkflowPlanner(mockLLM)

    const workflow = await planner.plan({
      type: 'voice',
      audioUrl: 'https://example.com/command.mp3'
    })

    expect(workflow.steps).toHaveLength(3)
    expect(workflow.steps[0].tool).toBe('transcribe_audio')
    expect(workflow.steps[1].tool).toBe('parse_api_request')
    expect(workflow.steps[2].tool).toBe('execute_api_call')

    // Check dependencies
    expect(workflow.steps[1].dependencies).toContain('step-1')
    expect(workflow.steps[2].dependencies).toContain('step-2')
  })

  it('should handle parallel steps correctly', async () => {
    const workflow = await planner.plan({
      type: 'text',
      input: 'Test API endpoints and scan for vulnerabilities'
    })

    const apiStep = workflow.steps.find(s => s.tool === 'call_custom_api')
    const scanStep = workflow.steps.find(s => s.tool === 'scan_endpoint')

    // These should be parallelizable
    expect(apiStep.dependencies).toHaveLength(0)
    expect(scanStep.dependencies).toHaveLength(0)
  })
})
```

**Run Unit Tests**

```bash
# Node.js with Vitest
npm test

# Python with pytest
pytest tests/ -v

# With coverage
npm test -- --coverage
pytest tests/ --cov=src --cov-report=html
```

### Integration Tests

**Testing MCP Client-Server Communication**

```javascript
// tests/integration/mcp-integration.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MCPClient } from '../src/mcp-client.js'
import { spawn } from 'child_process'

describe('MCP Integration', () => {
  let mcpProcess
  let client

  beforeAll(async () => {
    // Start MCP server
    mcpProcess = spawn('node', ['../mcp-servers/gladia/src/index.js'], {
      env: { ...process.env, PORT: 8888 }
    })

    // Wait for startup
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Connect client
    client = new MCPClient()
    await client.connect('http://localhost:8888')
  })

  afterAll(async () => {
    await client.disconnect()
    mcpProcess.kill()
  })

  it('should list available tools', async () => {
    const tools = await client.listTools()

    expect(tools).toContainEqual(
      expect.objectContaining({
        name: 'transcribe_audio',
        description: expect.any(String)
      })
    )
  })

  it('should execute tool successfully', async () => {
    const result = await client.callTool('transcribe_audio', {
      audioUrl: 'https://example.com/test.mp3',
      language: 'en'
    })

    expect(result.success).toBe(true)
    expect(result.transcription).toBeDefined()
  })
})
```

**Testing E2B + Docker Integration**

```javascript
// tests/integration/e2b-docker.test.js
import { Sandbox } from '@e2b/sdk'

describe('E2B Docker Integration', () => {
  let sandbox

  beforeAll(async () => {
    sandbox = await Sandbox.create({
      template: process.env.E2B_TEMPLATE_ID,
      timeout: 600000
    })
  }, 120000) // 2 minute timeout for sandbox creation

  afterAll(async () => {
    await sandbox.kill()
  })

  it('should start docker-compose services', async () => {
    const dockerComposeYml = `
version: '3.8'
services:
  test-service:
    image: nginx:alpine
    ports:
      - "8080:80"
`

    await sandbox.files.write('/root/docker-compose.yml', dockerComposeYml)

    const result = await sandbox.commands.run(
      'cd /root && docker-compose up -d',
      { timeoutMs: 60000 }
    )

    expect(result.exitCode).toBe(0)

    // Verify service is running
    const ps = await sandbox.commands.run('docker ps')
    expect(ps.stdout).toContain('test-service')
  })

  it('should allow HTTP requests to containers', async () => {
    const curl = await sandbox.commands.run(
      'curl -s http://localhost:8080',
      { timeoutMs: 10000 }
    )

    expect(curl.exitCode).toBe(0)
    expect(curl.stdout).toContain('nginx')
  })
})
```

### End-to-End Tests

**Full Workflow Test**

```javascript
// tests/e2e/voice-to-api.test.js
import { StepwiseAgent } from '../src/agent.js'
import fs from 'fs'

describe('Voice to API Workflow', () => {
  let agent

  beforeAll(async () => {
    agent = new StepwiseAgent({
      e2bApiKey: process.env.E2B_API_KEY,
      gladiaApiKey: process.env.GLADIA_API_KEY,
      honeyhiveApiKey: process.env.HONEYHIVE_API_KEY,
      aiGatewayApiKey: process.env.AI_GATEWAY_API_KEY
    })

    await agent.initialize()
  }, 180000) // 3 minute timeout

  afterAll(async () => {
    await agent.cleanup()
  })

  it('should process voice command end-to-end', async () => {
    // Use test audio file
    const audioPath = './tests/fixtures/test-command.mp3'
    const audioBuffer = fs.readFileSync(audioPath)

    const result = await agent.processVoiceCommand(audioBuffer, {
      sessionId: 'test-session-1'
    })

    // Verify workflow execution
    expect(result.success).toBe(true)
    expect(result.workflow.steps).toHaveLength(4)

    // Verify transcription step
    const transcribeStep = result.workflow.steps[0]
    expect(transcribeStep.tool).toBe('transcribe_audio')
    expect(transcribeStep.status).toBe('completed')
    expect(transcribeStep.result.transcription).toBeDefined()

    // Verify API call step
    const apiStep = result.workflow.steps.find(s => s.tool === 'call_custom_api')
    expect(apiStep.status).toBe('completed')
    expect(apiStep.result.response).toBeDefined()

    // Verify HoneyHive trace
    const traceStep = result.workflow.steps.find(s => s.tool === 'create_trace')
    expect(traceStep.result.trace_id).toBeDefined()
  }, 240000) // 4 minute timeout
})
```

**Run E2E Tests**

```bash
# Run with longer timeout
npm test:e2e -- --timeout 300000

# Run specific test
npm test:e2e -- voice-to-api
```

---

## Debugging Techniques

### MCP Inspector

Use the official MCP Inspector to debug MCP server communication:

```bash
# Install
npm install -g @modelcontextprotocol/inspector

# Launch inspector with your MCP server
mcp-inspector node mcp-servers/gladia/src/index.js

# Visit http://localhost:5173
```

The inspector allows you to:
- View available tools and resources
- Execute tools with custom parameters
- Inspect JSON-RPC messages
- Monitor logs in real-time

### E2B Sandbox Debugging

**1. Keep Sandbox Alive for Inspection**

```javascript
// Prevent auto-cleanup during debugging
const sandbox = await Sandbox.create({
  template: 'stepwise-debugger',
  timeout: 3600000 // 1 hour
})

// Run your test...

// Don't kill sandbox immediately
console.log('Sandbox ID:', sandbox.id)
console.log('Keeping sandbox alive for 1 hour for debugging')
```

**2. SSH into Running Sandbox**

```bash
# Get sandbox connection info
e2b sandbox list

# Connect to sandbox
e2b sandbox connect <sandbox-id>

# Inside sandbox, inspect containers
docker ps
docker logs <container-id>
docker exec -it <container-id> /bin/sh
```

**3. Stream Sandbox Logs**

```javascript
// Enable real-time logging
sandbox.on('log', (log) => {
  console.log(`[E2B ${log.level}]`, log.message)
})

const process = await sandbox.commands.run('docker-compose up', {
  onStdout: (data) => console.log('[STDOUT]', data),
  onStderr: (data) => console.error('[STDERR]', data)
})
```

### Docker Debugging

**View Container Logs**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f gladia-mcp

# Last 100 lines
docker-compose logs --tail=100 gladia-mcp
```

**Debug Container Networking**

```bash
# Inspect network
docker network inspect stepwise_mcp-network

# Test connectivity between containers
docker exec gladia-mcp ping honeyhive-mcp

# Check port bindings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

**Debug Build Issues**

```bash
# Build with no cache
docker-compose build --no-cache

# Build with verbose output
docker-compose build --progress=plain

# Build specific service
docker-compose build gladia-mcp
```

### LLM Debugging

**Log LLM Prompts and Responses**

```javascript
// agent/src/llm-client.js
class LLMClient {
  async chat(messages) {
    // Log prompt
    console.log('\n=== LLM PROMPT ===')
    console.log(JSON.stringify(messages, null, 2))

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages
    })

    // Log response
    console.log('\n=== LLM RESPONSE ===')
    console.log(response.choices[0].message.content)

    return response
  }
}
```

**Use HoneyHive for Observability**

```javascript
// Automatic tracing of all LLM calls
import { HoneyHive } from '@honeyhive/sdk'

const hh = new HoneyHive({
  apiKey: process.env.HONEYHIVE_API_KEY,
  project: 'stepwise-debug'
})

// Wrap LLM calls
const traced = hh.trace(async (tracer) => {
  const span = tracer.startSpan('workflow_planning')

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: planningPrompt
  })

  span.end()
  return response
})

// View traces at https://app.honeyhive.ai
```

### VS Code Debugging

**launch.json for Node.js**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Agent",
      "program": "${workspaceFolder}/agent/src/index.js",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Gladia MCP",
      "program": "${workspaceFolder}/mcp-servers/gladia/src/index.js",
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229
    }
  ]
}
```

**launch.json for Python**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "python",
      "request": "launch",
      "program": "${workspaceFolder}/frontend/app.py",
      "console": "integratedTerminal",
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

---

## Git Workflow

### Branch Strategy

```bash
main           # Production-ready code
  ├─ develop   # Integration branch
      ├─ feature/gladia-integration
      ├─ feature/honeyhive-traces
      ├─ feature/horizon3-scanning
      └─ bugfix/transcription-error
```

### Commit Convention

Use conventional commits:

```bash
# Format: <type>(<scope>): <subject>

feat(gladia): add audio transcription MCP tool
fix(agent): handle timeout errors in workflow executor
docs(readme): add quickstart guide
refactor(mcp): extract common HTTP client logic
test(e2e): add voice-to-API integration test
chore(deps): upgrade E2B SDK to v1.2.0
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

### Pre-commit Hooks

**Setup Husky + lint-staged**

```bash
npm install --save-dev husky lint-staged

# Initialize husky
npx husky init
```

**.husky/pre-commit**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
npm test
```

**package.json**

```json
{
  "lint-staged": {
    "*.js": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.py": [
      "black",
      "flake8"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

### Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Description
<!-- Brief description of changes -->

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation
- [ ] Refactoring

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings or errors

## Related Issues
Closes #<issue-number>
```

---

## Code Quality

### Linting

**ESLint for JavaScript**

```javascript
// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true
  },
  extends: [
    'eslint:recommended',
    'plugin:security/recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'error',
    'no-console': 'warn',
    'security/detect-object-injection': 'off'
  }
}
```

**Flake8 for Python**

```ini
# .flake8
[flake8]
max-line-length = 100
exclude = .git,__pycache__,build,dist,.venv
ignore = E203,W503
```

### Formatting

**Prettier**

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Black (Python)**

```toml
# pyproject.toml
[tool.black]
line-length = 100
target-version = ['py39']
```

### Type Checking

**TypeScript (if using TS)**

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**JSDoc (for vanilla JS)**

```javascript
/**
 * Execute a workflow with dependency resolution
 * @param {Workflow} workflow - The workflow to execute
 * @param {Session} session - The user session
 * @returns {Promise<WorkflowResult>} Execution result
 * @throws {WorkflowExecutionError} If execution fails
 */
async function executeWorkflow(workflow, session) {
  // ...
}
```

---

## Hackathon Demo Deployment

### Pre-Demo Checklist

**2 Weeks Before:**
- [ ] All 3 sponsor tools integrated (Gladia, HoneyHive, Horizon3)
- [ ] E2B + Docker working end-to-end
- [ ] Basic frontend functional
- [ ] Core workflow (voice → API → result) working

**1 Week Before:**
- [ ] Error handling robust
- [ ] Demo script written and practiced
- [ ] Test data prepared
- [ ] Deployment tested on clean environment
- [ ] Video/screenshots captured
- [ ] Backup plan for live demo

**24 Hours Before:**
- [ ] Final deployment to production
- [ ] Health checks passing
- [ ] API keys verified and working
- [ ] Demo rehearsal completed
- [ ] Backup laptop/network ready

### Deployment Options

**Option 1: Cloud VM (Recommended for Stability)**

```bash
# Provision VM (AWS EC2, GCP Compute, etc.)
# Ubuntu 22.04, 4 vCPU, 8GB RAM

# SSH into VM
ssh ubuntu@<your-vm-ip>

# Install dependencies
sudo apt update
sudo apt install -y docker.io docker-compose git nodejs npm python3 python3-pip

# Clone and setup
git clone <your-repo>
cd Stepwise
cp .env.example .env
nano .env  # Add production API keys

# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Start frontend
cd frontend
python3 app.py --share  # Creates public Gradio link
```

**docker-compose.prod.yml**

```yaml
version: '3.8'

services:
  gladia-mcp:
    build: ./mcp-servers/gladia
    restart: always
    environment:
      - GLADIA_API_KEY=${GLADIA_API_KEY}
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      retries: 3

  honeyhive-mcp:
    build: ./mcp-servers/honeyhive
    restart: always
    environment:
      - HONEYHIVE_API_KEY=${HONEYHIVE_API_KEY}
      - NODE_ENV=production

  horizon3-mcp:
    build: ./mcp-servers/horizon3
    restart: always
    environment:
      - HORIZON3_API_KEY=${HORIZON3_API_KEY}
      - NODE_ENV=production

  agent:
    build: ./agent
    restart: always
    environment:
      - E2B_API_KEY=${E2B_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - gladia-mcp
      - honeyhive-mcp
      - horizon3-mcp

networks:
  default:
    name: stepwise-prod
```

**Option 2: Local Demo with Ngrok**

```bash
# Start services locally
docker-compose up -d

# Start frontend
cd frontend
python app.py

# In another terminal, expose with ngrok
ngrok http 7860

# Share the ngrok URL: https://xxxx.ngrok.io
```

**Option 3: Gradio Public Link**

```python
# frontend/app.py
demo.launch(
    server_name="0.0.0.0",
    server_port=7860,
    share=True  # Creates public Gradio link
)
```

### Health Check Endpoint

```javascript
// agent/src/server.js
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {}
  }

  try {
    // Check MCP servers
    const gladiaHealth = await fetch('http://gladia-mcp:8000/health')
    health.services.gladia = gladiaHealth.ok ? 'up' : 'down'

    const honeyhiveHealth = await fetch('http://honeyhive-mcp:8001/health')
    health.services.honeyhive = honeyhiveHealth.ok ? 'up' : 'down'

    const horizon3Health = await fetch('http://horizon3-mcp:8002/health')
    health.services.horizon3 = horizon3Health.ok ? 'up' : 'down'

    // Check E2B
    const sandbox = await Sandbox.create({ timeout: 10000 })
    await sandbox.kill()
    health.services.e2b = 'up'
  } catch (error) {
    health.status = 'degraded'
    health.error = error.message
  }

  const status = health.status === 'healthy' ? 200 : 503
  res.status(status).json(health)
})
```

---

## Demo Script

### 3-Minute Demo Flow

**Slide 1: Problem (15 seconds)**
> "Debugging APIs is tedious - you need to transcribe voice commands, parse them, make API calls, trace execution, and check security. What if an AI agent could do this end-to-end?"

**Slide 2: Solution (15 seconds)**
> "Meet Stepwise - a live API debugger agent using Model Context Protocol, E2B sandboxes, and Docker. It integrates Gladia for speech-to-text, HoneyHive for observability, and Horizon3 for security scanning."

**Live Demo: Voice to API (90 seconds)**

1. **Show Interface** (10s)
   - "Here's our Gradio interface. I can use text or voice input."

2. **Voice Command** (20s)
   - Record: "Test the JSON Placeholder API by getting user data for ID 1, then trace the execution in HoneyHive"
   - Click Submit
   - Show transcription appearing

3. **Workflow Execution** (30s)
   - Point out workflow steps appearing in real-time:
     - Transcribing audio with Gladia
     - Planning API calls with GPT-4
     - Executing in E2B sandbox with Docker MCP servers
     - Creating HoneyHive trace
   - Show successful response with user data

4. **Observability** (15s)
   - Open HoneyHive dashboard in another tab
   - Show the trace with all steps, latencies, LLM calls
   - "Every step is traced for debugging and optimization"

5. **Security Scan** (15s)
   - Back to Stepwise, run: "Scan the API endpoint for vulnerabilities"
   - Show Horizon3 scan results
   - "Automated security checks on every API"

**Slide 3: Architecture (30 seconds)**
> "Under the hood: The agent runs in Node.js, orchestrates 3 MCP servers running in Docker containers within E2B sandboxes. This provides isolation, observability, and security out of the box."

Show diagram:
```
[Gradio UI] → [Agent] → [E2B Sandbox]
                           ├─ [Gladia MCP]
                           ├─ [HoneyHive MCP]
                           └─ [Horizon3 MCP]
```

**Slide 4: Use Cases & Next Steps (30 seconds)**
> "Use cases: API testing, security auditing, workflow automation, voice-controlled debugging. Next steps: Add more sponsor tools, support webhooks, multi-agent collaboration."

> "Questions?"

### Backup Demo (No Internet)

Pre-record a video showing:
1. Voice input being transcribed
2. Workflow executing with all 3 sponsor tools
3. HoneyHive traces
4. Horizon3 scan results

Have it ready to play if live demo fails.

### Demo Tips

1. **Test everything 30 minutes before**: Run through the entire demo to ensure all services are healthy
2. **Have API keys ready**: Keep backup keys in case primary ones hit rate limits
3. **Prepare fallback**: If voice fails, use text input
4. **Keep terminal open**: Show docker-compose logs in background to prove it's running live
5. **Practice timing**: Rehearse to fit in 3 minutes with buffer for questions

---

## Troubleshooting

### Common Issues

**Issue: E2B Sandbox Creation Fails**

```bash
Error: Failed to create sandbox: insufficient credits
```

**Solution:**
```bash
# Check E2B credits
e2b sandbox quota

# If out of credits, use local development mode
export USE_E2B=false
npm run dev
```

**Issue: Docker Compose Services Not Starting**

```bash
Error: Service 'gladia-mcp' failed to start
```

**Solution:**
```bash
# Check logs
docker-compose logs gladia-mcp

# Rebuild specific service
docker-compose build --no-cache gladia-mcp

# Verify environment variables
docker-compose config

# Check if ports are already in use
lsof -i :8000
```

**Issue: MCP Tool Execution Timeout**

```bash
Error: Tool 'transcribe_audio' timed out after 30000ms
```

**Solution:**
```javascript
// Increase timeout in MCP client
const result = await mcpClient.callTool('transcribe_audio', params, {
  timeoutMs: 120000  // 2 minutes instead of 30 seconds
})

// Or adjust in tool definition
mcp.tool({
  name: 'transcribe_audio',
  timeout: 120000,  // milliseconds
  execute: async (params) => { /* ... */ }
})
```

**Issue: Gladia API Returns 401**

```bash
Error: Gladia API authentication failed
```

**Solution:**
```bash
# Verify API key
echo $GLADIA_API_KEY

# Test directly
curl -X POST https://api.gladia.io/v2/transcription \
  -H "X-Gladia-Key: $GLADIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"audio_url": "https://example.com/test.mp3"}'

# Check key hasn't expired at https://gladia.io/dashboard
```

**Issue: HoneyHive Traces Not Appearing**

```bash
Warning: Trace created but not visible in dashboard
```

**Solution:**
```javascript
// Ensure project name matches dashboard
const hh = new HoneyHive({
  apiKey: process.env.HONEYHIVE_API_KEY,
  project: 'stepwise-agent'  // Must match project in HoneyHive
})

// Add explicit flush
await hh.flush()

// Check API key permissions at https://app.honeyhive.ai
```

**Issue: Out of Memory in E2B Sandbox**

```bash
Error: Command killed due to memory limit
```

**Solution:**
```javascript
// Use larger sandbox template
const sandbox = await Sandbox.create({
  template: 'stepwise-debugger',
  memoryMb: 4096,  // Default is 2GB, increase to 4GB
  cpuCount: 2
})

// Or optimize Docker containers
// In Dockerfile:
CMD ["node", "--max-old-space-size=512", "index.js"]
```

**Issue: Gradio Interface Not Loading**

```bash
Error: Failed to start Gradio server
```

**Solution:**
```bash
# Check Python version
python --version  # Should be 3.9+

# Reinstall Gradio
pip install --upgrade gradio

# Check port availability
lsof -i :7860

# Try different port
python app.py --server-port 8080
```

### Debug Logs Collection

Create a debug script for troubleshooting:

```bash
#!/bin/bash
# debug-collect.sh

echo "=== System Info ==="
uname -a
docker --version
node --version
python --version

echo -e "\n=== E2B Status ==="
e2b sandbox list

echo -e "\n=== Docker Status ==="
docker ps -a
docker-compose ps

echo -e "\n=== Service Logs ==="
docker-compose logs --tail=50 gladia-mcp
docker-compose logs --tail=50 honeyhive-mcp
docker-compose logs --tail=50 horizon3-mcp
docker-compose logs --tail=50 agent

echo -e "\n=== Network ==="
docker network inspect stepwise_mcp-network

echo -e "\n=== Disk Usage ==="
df -h
docker system df

echo -e "\n=== Environment ==="
env | grep -E '(GLADIA|HONEYHIVE|HORIZON3|E2B|OPENAI)' | sed 's/=.*/=***/'
```

Run before reporting issues:
```bash
chmod +x debug-collect.sh
./debug-collect.sh > debug-report.txt
```

---

## Performance Optimization

### Caching Strategies

**Cache E2B Templates**

```javascript
// Pre-build template once
e2b template build --name stepwise-debugger

// Reuse template for all sandboxes (much faster than installing Docker each time)
const sandbox = await Sandbox.create({
  template: 'stepwise-debugger'  // Uses cached template
})
```

**Cache Docker Images**

```yaml
# docker-compose.yml
services:
  gladia-mcp:
    image: stepwise/gladia-mcp:latest  # Use pre-built image
    # build: ./mcp-servers/gladia  # Only uncomment for dev
```

**Cache LLM Responses (Dev Only)**

```javascript
import { LRUCache } from 'lru-cache'

const cache = new LRUCache({ max: 100, ttl: 1000 * 60 * 60 })  // 1 hour

async function cachedLLMCall(prompt) {
  const key = hash(prompt)

  if (cache.has(key)) {
    return cache.get(key)
  }

  const response = await openai.chat.completions.create(prompt)
  cache.set(key, response)
  return response
}
```

### Parallel Execution

Leverage async operations:

```javascript
// Sequential (slow)
const transcription = await gladia.transcribe(audio)
const trace = await honeyhive.createTrace()
const scan = await horizon3.scan(endpoint)

// Parallel (3x faster)
const [transcription, trace, scan] = await Promise.all([
  gladia.transcribe(audio),
  honeyhive.createTrace(),
  horizon3.scan(endpoint)
])
```

### Monitor Performance

```javascript
import { performance } from 'perf_hooks'

async function timedExecute(name, fn) {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`)
    return result
  } catch (error) {
    const duration = performance.now() - start
    console.error(`[PERF] ${name} failed after ${duration.toFixed(2)}ms`)
    throw error
  }
}

// Usage
const transcription = await timedExecute('gladia.transcribe', () =>
  gladia.transcribe(audioUrl)
)
```

---

## Resources

- **E2B Documentation**: https://e2b.dev/docs
- **MCP Specification**: https://modelcontextprotocol.io/docs
- **Gladia API**: https://docs.gladia.io
- **HoneyHive SDK**: https://docs.honeyhive.ai
- **Horizon3 API**: https://docs.horizon3.ai
- **FastMCP**: https://github.com/jlowin/fastmcp
- **Gradio**: https://www.gradio.app/docs

## Next Steps

1. **Implement remaining features** from MCP_SERVERS.md
2. **Write comprehensive tests** following patterns in this guide
3. **Set up CI/CD pipeline** with GitHub Actions
4. **Practice demo script** at least 3 times before hackathon
5. **Join E2B + Docker MCP Hackathon Discord** for support

Good luck with the hackathon! 🚀
