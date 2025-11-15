# Phase 1: Foundation & Environment Setup

**Duration**: 4-6 hours
**Priority**: Critical
**Risk Level**: Low
**Prerequisites**: None (entry phase)

## Overview

Phase 1 establishes the foundation for the entire Stepwise project. You'll set up your development environment, obtain all necessary API keys, create the project structure, and validate that all systems are operational before proceeding to build features.

This phase is critical because problems caught here (invalid API keys, Docker issues, E2B authentication) are much easier to fix than discovering them during integration in later phases.

## Objectives

1. Install and configure all required development tools
2. Obtain and validate API keys for all services (E2B, Gladia, HoneyHive, Horizon3, Vercel AI Gateway)
3. Create comprehensive project directory structure
4. Initialize Git repository with proper .gitignore
5. Create environment configuration files
6. Validate that Docker and E2B are working
7. Document quickstart instructions in README

## Key Deliverables

### 1. Development Environment
- [ ] Node.js 18+ or Python 3.9+ installed
- [ ] Docker Desktop 4.25+ installed and running
- [ ] Docker Compose 2.0+ available
- [ ] Git 2.30+ installed
- [ ] E2B CLI installed and authenticated
- [ ] Code editor (VS Code recommended) configured

### 2. Project Structure
```
Stepwise/
├── .env.example              # Template for environment variables
├── .env                      # Actual secrets (gitignored)
├── .gitignore               # Comprehensive ignore patterns
├── README.md                # Project overview & quickstart
├── package.json             # Root package.json (if using monorepo)
├── docker-compose.yml       # Local development orchestration
├── docker-compose.prod.yml  # Production configuration
│
├── agent/                   # Main agent application
│   ├── package.json         # Agent dependencies
│   ├── Dockerfile           # Agent container
│   ├── src/
│   │   ├── index.js         # Entry point
│   │   ├── agent.js         # Agent class
│   │   ├── config.js        # Configuration loader
│   │   ├── llm/             # LLM integration
│   │   ├── mcp/             # MCP client
│   │   ├── workflow/        # Workflow engine
│   │   ├── e2b/             # E2B integration
│   │   └── api/             # HTTP API
│   └── tests/               # Agent tests
│
├── mcp-servers/             # All MCP servers
│   ├── gladia/              # Gladia MCP server
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── tools.js
│   │   └── tests/
│   │
│   ├── honeyhive/           # HoneyHive MCP server
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── server.py
│   │   │   └── tools.py
│   │   └── tests/
│   │
│   ├── horizon3/            # Horizon3 MCP server
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── src/
│   │   │   ├── index.js
│   │   │   └── tools.js
│   │   └── tests/
│   │
│   └── custom-api/          # Generic API MCP server
│       ├── package.json
│       ├── Dockerfile
│       ├── src/
│       │   ├── index.js
│       │   └── tools.js
│       └── tests/
│
├── frontend/                # Gradio interface
│   ├── requirements.txt
│   ├── app.py              # Main Gradio app
│   ├── components/         # Custom Gradio components
│   └── assets/             # Images, CSS, etc.
│
├── e2b-template/            # E2B custom template
│   ├── Dockerfile          # Template with Docker pre-installed
│   └── e2b.toml           # E2B configuration
│
├── docs/                    # Comprehensive documentation
│   ├── CLAUDE.md
│   ├── ARCHITECTURE.md
│   ├── E2B_INTEGRATION.md
│   ├── MCP_SERVERS.md
│   ├── WORKFLOW_ORCHESTRATION.md
│   ├── DOCKER_SETUP.md
│   ├── FRONTEND_GUIDE.md
│   ├── SECURITY.md
│   └── DEVELOPMENT_WORKFLOW.md
│
└── phases/                  # Implementation phases
    ├── README.md
    ├── PHASE_1.md
    ├── PHASE_2.md
    ├── PHASE_3.md
    ├── PHASE_4.md
    ├── PHASE_5.md
    ├── PHASE_6.md
    ├── PHASE_7.md
    └── PHASE_8.md
```

### 3. Configuration Files
- [ ] `.env.example` with all required variables
- [ ] `.env` with actual API keys (gitignored)
- [ ] `.gitignore` covering secrets, node_modules, __pycache__, etc.
- [ ] Root `README.md` with quickstart guide

### 4. API Keys & Accounts
- [ ] E2B account and API key
- [ ] Gladia account and API key
- [ ] HoneyHive account and API key
- [ ] Horizon3.ai account and API key
- [ ] Vercel AI Gateway API key (unified LLM access)
- [ ] All keys validated and working

## Dependencies

None - this is the entry phase.

## Success Criteria

At the end of Phase 1, you must be able to check off ALL of the following:

### Environment Validation
- [ ] `node --version` shows v18 or higher (or `python --version` shows 3.9+)
- [ ] `docker --version` shows version 4.25 or higher
- [ ] `docker-compose --version` shows version 2.0 or higher
- [ ] `git --version` shows version 2.30 or higher
- [ ] `e2b --version` shows E2B CLI is installed
- [ ] Docker Desktop is running (verified by `docker ps`)

### API Access Validation
- [ ] E2B CLI authenticated (`e2b auth login` completed)
- [ ] Can create and destroy E2B sandbox (`e2b sandbox create`)
- [ ] Gladia API key works (test with curl)
- [ ] HoneyHive API key works (test with curl or SDK)
- [ ] Horizon3 API key works (test with curl)
- [ ] Vercel AI Gateway API key works (test with curl)
- [ ] All 5 AI Gateway models validated as available

### Project Structure
- [ ] All directories created according to structure above
- [ ] Git repository initialized
- [ ] `.gitignore` prevents committing secrets
- [ ] `.env.example` documents all required variables
- [ ] `.env` contains all actual API keys

### Documentation
- [ ] README.md exists with project overview
- [ ] README includes quickstart instructions
- [ ] README lists all prerequisites
- [ ] README explains how to obtain API keys

## Detailed Implementation Steps

### Step 1: Install Development Tools (1 hour)

#### Install Node.js (if using Node.js for agent)

**macOS:**
```bash
# Using Homebrew
brew install node@18

# Verify
node --version  # Should show v18.x or higher
npm --version
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

node --version
npm --version
```

**Windows:**
Download installer from https://nodejs.org

#### Install Python (if using Python for agent)

**macOS:**
```bash
brew install python@3.11

python3 --version  # Should show 3.11.x
pip3 --version
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y python3.11 python3-pip

python3 --version
pip3 --version
```

**Windows:**
Download installer from https://python.org

#### Install Docker Desktop

**macOS/Windows:**
1. Download from https://www.docker.com/products/docker-desktop
2. Install and start Docker Desktop
3. Verify:
```bash
docker --version
docker-compose --version
docker ps  # Should show empty list, not error
```

**Linux:**
```bash
# Install Docker Engine
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group (avoid sudo)
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo apt-get install docker-compose-plugin

docker --version
docker compose version
```

#### Install Git

**macOS:**
```bash
brew install git
```

**Linux:**
```bash
sudo apt-get install git
```

**Windows:**
Download from https://git-scm.com

Verify:
```bash
git --version
```

#### Install E2B CLI (v2)

```bash
# Using npm (latest for E2B v2)
npm install -g @e2b/cli@latest

# Or using pip
pip install e2b-cli>=0.10.0

# Verify
e2b --version
```

**Note on E2B v2 API Changes**:
- The E2B SDK v2 changes how sandboxes are created and files are accessed
- Use `Sandbox.create()` instead of `new Sandbox()` (v1 pattern)
- File operations now use `sandbox.files.write()` and `sandbox.files.read()`
- See [docs/E2B_INTEGRATION.md](../docs/E2B_INTEGRATION.md) for updated patterns

#### Install VS Code (Recommended)

Download from https://code.visualstudio.com

**Recommended Extensions:**
- ESLint (for JavaScript linting)
- Prettier (code formatting)
- Python (if using Python)
- Docker (for Dockerfile editing)
- GitLens (enhanced Git integration)

### Step 2: Obtain API Keys (30 minutes - 1 hour)

#### E2B API Key

1. Visit https://e2b.dev
2. Sign up for an account
3. Navigate to Dashboard → API Keys
4. Create new API key
5. Copy and save securely

**Test E2B Access:**
```bash
# Authenticate CLI
e2b auth login
# Paste your API key when prompted

# Test sandbox creation
e2b sandbox create
# Should show sandbox ID and confirmation

# List sandboxes
e2b sandbox list

# Kill the test sandbox
e2b sandbox kill <sandbox-id>
```

#### Gladia API Key

1. Visit https://gladia.io
2. Sign up for an account
3. Navigate to Dashboard → API Keys
4. Create new API key
5. Copy and save

**Test Gladia API:**
```bash
curl -X POST https://api.gladia.io/v2/transcription \
  -H "X-Gladia-Key: YOUR_GLADIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "audio_url": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "language": "en"
  }'

# Should return transcription result, not 401 error
```

#### HoneyHive API Key

1. Visit https://honeyhive.ai
2. Sign up for an account
3. Navigate to Settings → API Keys
4. Create new API key
5. Copy and save

**Create HoneyHive Project:**
```bash
# Install HoneyHive SDK to test
npm install @honeyhive/sdk
# or
pip install honeyhive
```

**Install HoneyHive SDK:**
```bash
# Node.js (v0.2.57+)
npm install @honeyhive/sdk@latest

# Or update existing installation
npm update @honeyhive/sdk
```

**Test HoneyHive API (Node.js):**
```javascript
import { HoneyHive } from '@honeyhive/sdk'

const hh = new HoneyHive({
  apiKey: 'YOUR_HONEYHIVE_API_KEY',
  project: 'stepwise-agent'
})

// Test trace creation
const trace = await hh.traces.create({
  name: 'test-trace',
  traceId: 'test-123'
})

console.log('HoneyHive working:', trace)
```

#### Horizon3.ai API Key

1. Visit https://horizon3.ai
2. Sign up for an account
3. Navigate to API Settings
4. Generate API key
5. Copy and save

**Test Horizon3 API:**
```bash
curl -X GET https://api.horizon3.ai/v1/scans \
  -H "Authorization: Bearer YOUR_HORIZON3_API_KEY"

# Should return list of scans (may be empty), not 401
```

**Note**: Horizon3.ai API documentation may be limited. If you can't access the API, document this in your README and plan to implement a mock version for the demo.

#### Vercel AI Gateway API Key

Stepwise uses Vercel AI Gateway for unified access to multiple LLM providers through a single API.

1. Visit https://vercel.com
2. Navigate to your project → AI Gateway section
3. Generate an API key
4. Copy and save securely

**Test AI Gateway Access:**
```bash
curl https://ai-gateway.vercel.sh/v1/models \
  -H "Authorization: Bearer YOUR_AI_GATEWAY_API_KEY" \
  -H "Content-Type: application/json"

# Should return list of available models including:
# - anthropic/claude-haiku-4.5
# - anthropic/claude-sonnet-4.5
# - openai/gpt-5.1-instant
# - openai/gpt-5.1-codex
# - openai/gpt-5.1-thinking
```

**Verify AI Gateway is working:**

See `docs/AI_GATEWAY_INTEGRATION.md` for complete setup guide and model selection strategy.

### Step 3: Create Project Structure (30 minutes)

```bash
# Navigate to your development directory
cd ~/projects  # or wherever you keep projects

# Create root directory
mkdir Stepwise
cd Stepwise

# Initialize Git
git init

# Create directory structure
mkdir -p agent/src/{llm,mcp,workflow,e2b,api,security}
mkdir -p agent/tests

mkdir -p mcp-servers/gladia/src
mkdir -p mcp-servers/gladia/tests

mkdir -p mcp-servers/honeyhive/src
mkdir -p mcp-servers/honeyhive/tests

mkdir -p mcp-servers/horizon3/src
mkdir -p mcp-servers/horizon3/tests

mkdir -p mcp-servers/custom-api/src
mkdir -p mcp-servers/custom-api/tests

mkdir -p frontend/{components,assets}

mkdir -p e2b-template

mkdir -p docs
mkdir -p phases

# Verify structure
tree -L 3  # or `ls -R` if tree not installed
```

### Step 4: Create Configuration Files (1 hour)

#### Create `.gitignore`

```bash
cat > .gitignore << 'EOF'
# Environment variables
.env
.env.local
.env.*.local

# Dependencies
node_modules/
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
pip-log.txt
pip-delete-this-directory.txt
.venv/
venv/
ENV/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Build outputs
dist/
build/
*.egg-info/
.pytest_cache/
.coverage
htmlcov/

# Logs
*.log
logs/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# E2B
.e2b/

# Docker
.docker/

# Temporary files
*.tmp
*.bak
.cache/

# Secrets (double-check these are ignored)
**/secrets.json
**/credentials.json
**/*_secret*
**/*_key*
EOF
```

#### Create `.env.example`

```bash
cat > .env.example << 'EOF'
# E2B Configuration
E2B_API_KEY=your_e2b_api_key_here
E2B_TEMPLATE_ID=your_e2b_template_id_here  # Will be generated in Phase 3

# Sponsor API Keys
GLADIA_API_KEY=your_gladia_api_key_here
HONEYHIVE_API_KEY=your_honeyhive_api_key_here
HORIZON3_API_KEY=your_horizon3_api_key_here

# Vercel AI Gateway - Unified LLM Access
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_api_key_here
AI_GATEWAY_BASE_URL=https://ai-gateway.vercel.sh/v1

# Model Selection (defaults provided, customize as needed)
AI_GATEWAY_DEFAULT_MODEL=anthropic/claude-sonnet-4.5
AI_GATEWAY_FAST_MODEL=anthropic/claude-haiku-4.5
AI_GATEWAY_INSTANT_MODEL=openai/gpt-5.1-instant
AI_GATEWAY_CODE_MODEL=openai/gpt-5.1-codex
AI_GATEWAY_REASONING_MODEL=openai/gpt-5.1-thinking

# Application Configuration
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000

# MCP Server URLs (will be Docker service names in production)
GLADIA_MCP_URL=http://localhost:8000
HONEYHIVE_MCP_URL=http://localhost:8001
HORIZON3_MCP_URL=http://localhost:8002
CUSTOM_API_MCP_URL=http://localhost:8003

# Feature Flags
USE_E2B=true
ENABLE_VOICE_INPUT=true
ENABLE_SECURITY_SCAN=true

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=10
MAX_WORKFLOW_DURATION_MS=300000  # 5 minutes

# HoneyHive Configuration
HONEYHIVE_PROJECT=stepwise-agent
EOF
```

#### Create `.env` with actual keys

```bash
# Copy template
cp .env.example .env

# Edit with your actual API keys
nano .env  # or vim, code, etc.

# IMPORTANT: Verify .env is gitignored
git status  # Should NOT show .env
```

#### Create Root `README.md`

```bash
cat > README.md << 'EOF'
# Stepwise - Live API Debugger Agent

AI agent that debugs APIs end-to-end using voice/text input, powered by MCP, E2B, and Docker.

Built for the E2B + Docker MCP Hackathon with integration of 3 sponsor tools:
- **Gladia**: Speech-to-text transcription
- **HoneyHive**: LLM observability and tracing
- **Horizon3.ai**: Security scanning and RBAC validation

## Architecture

```
[User Input: Voice/Text]
        ↓
[Gradio Frontend]
        ↓
[Stepwise Agent] ←→ [AI Gateway: 5 Models]
                      ├─ Claude Haiku/Sonnet (Anthropic)
                      └─ GPT-5.1 variants (OpenAI)
        ↓
[E2B Sandbox Environment]
        ↓
   [Docker Network]
        ├─ [Gladia MCP Server]
        ├─ [HoneyHive MCP Server]
        ├─ [Horizon3 MCP Server]
        └─ [Custom API MCP Server]
```

## Features

- **Voice-to-API Workflow**: Speak your API testing command, get results
- **Multi-Step Orchestration**: Agent plans and executes complex workflows
- **Observability**: Every step traced in HoneyHive
- **Security**: Automated vulnerability scanning with Horizon3
- **Isolated Execution**: E2B sandboxes with Docker containers

## Quick Start

### Prerequisites

- Node.js 18+ or Python 3.9+
- Docker Desktop 4.25+
- E2B CLI
- API Keys: E2B, Gladia, HoneyHive, Horizon3, Vercel AI Gateway

### Installation

```bash
# Clone repository
git clone <repo-url>
cd Stepwise

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
nano .env

# Install dependencies (if using Node.js agent)
cd agent && npm install

# Or install Python dependencies
cd agent && pip install -r requirements.txt

# Install MCP server dependencies
cd ../mcp-servers/gladia && npm install
cd ../honeyhive && pip install -r requirements.txt
cd ../horizon3 && npm install
cd ../custom-api && npm install

# Install frontend dependencies
cd ../../frontend && pip install -r requirements.txt
```

### Running Locally (without E2B)

```bash
# Terminal 1: Start Gladia MCP
cd mcp-servers/gladia
npm start

# Terminal 2: Start HoneyHive MCP
cd mcp-servers/honeyhive
python src/server.py

# Terminal 3: Start Horizon3 MCP
cd mcp-servers/horizon3
npm start

# Terminal 4: Start Custom API MCP
cd mcp-servers/custom-api
npm start

# Terminal 5: Start Agent
cd agent
npm start  # or python src/index.py

# Terminal 6: Start Frontend
cd frontend
python app.py

# Visit http://localhost:7860
```

### Running with E2B + Docker

```bash
# Build E2B template (one-time)
cd e2b-template
e2b template build --name stepwise-debugger

# Add template ID to .env
echo "E2B_TEMPLATE_ID=<template-id>" >> ../.env

# Build Docker images
cd ..
docker-compose build

# Start agent (will create E2B sandbox automatically)
cd agent
npm start

# Start frontend
cd ../frontend
python app.py
```

## Project Structure

- `/agent` - Main agent application with workflow orchestration
- `/mcp-servers` - All 4 MCP servers (Gladia, HoneyHive, Horizon3, Custom API)
- `/frontend` - Gradio web interface
- `/e2b-template` - E2B custom template with Docker
- `/docs` - Comprehensive technical documentation
- `/phases` - Phase-by-phase implementation guide

## Documentation

- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and component interaction
- **[E2B Integration](docs/E2B_INTEGRATION.md)** - Sandbox lifecycle and Docker management
- **[MCP Servers](docs/MCP_SERVERS.md)** - Building and integrating MCP servers
- **[Workflow Orchestration](docs/WORKFLOW_ORCHESTRATION.md)** - Multi-step agent logic
- **[Docker Setup](docs/DOCKER_SETUP.md)** - Containerization and orchestration
- **[Frontend Guide](docs/FRONTEND_GUIDE.md)** - Gradio interface implementation
- **[Security](docs/SECURITY.md)** - Security best practices
- **[Development Workflow](docs/DEVELOPMENT_WORKFLOW.md)** - Testing, debugging, deployment

## Implementation Phases

Follow the [phase-by-phase guide](phases/README.md) to build Stepwise from scratch:

1. [Foundation & Environment Setup](phases/PHASE_1.md) - 4-6 hours
2. [MCP Server Development](phases/PHASE_2.md) - 12-16 hours
3. [E2B + Docker Integration](phases/PHASE_3.md) - 8-10 hours
4. [Agent Core Logic](phases/PHASE_4.md) - 10-14 hours
5. [Frontend Development](phases/PHASE_5.md) - 6-8 hours
6. [Security & Robustness](phases/PHASE_6.md) - 4-6 hours
7. [Testing & Documentation](phases/PHASE_7.md) - 6-8 hours
8. [Deployment & Demo Prep](phases/PHASE_8.md) - 4-6 hours

Total: 54-74 hours

## Demo

**3-Minute Demo Script**: [phases/PHASE_8.md#demo-script](phases/PHASE_8.md#demo-script)

Example workflow:
1. User speaks: "Test the JSONPlaceholder API by getting user 1"
2. Gladia transcribes audio
3. Agent plans workflow with GPT-4
4. Custom API MCP calls https://jsonplaceholder.typicode.com/users/1
5. HoneyHive traces entire execution
6. Horizon3 scans endpoint for vulnerabilities
7. Results displayed in Gradio UI

## API Keys & Accounts

To obtain required API keys:

- **E2B**: Sign up at https://e2b.dev
- **Gladia**: Sign up at https://gladia.io
- **HoneyHive**: Sign up at https://honeyhive.ai
- **Horizon3.ai**: Sign up at https://horizon3.ai
- **Vercel AI Gateway**: Sign up at https://vercel.com/docs/ai-gateway
  (Provides unified access to OpenAI and Anthropic models)

## Troubleshooting

See [Development Workflow Guide](docs/DEVELOPMENT_WORKFLOW.md#troubleshooting) for common issues and solutions.

**Common Issues**:
- **E2B sandbox timeout**: Increase timeout or use local Docker mode
- **MCP tool not found**: Check MCP server is running and healthy
- **Docker container fails**: Check logs with `docker-compose logs <service>`
- **API rate limit**: Use backup API keys or reduce test frequency

## License

MIT

## Acknowledgments

Built for the E2B + Docker MCP Hackathon with support from:
- E2B for cloud sandbox infrastructure
- Gladia for speech-to-text capabilities
- HoneyHive for LLM observability
- Horizon3.ai for security scanning
EOF
```

### Step 5: Validate All Systems (1-2 hours)

#### Test E2B

```bash
# Create test sandbox
e2b sandbox create

# Should output:
# Sandbox created successfully
# ID: <sandbox-id>

# List sandboxes
e2b sandbox list

# Kill sandbox
e2b sandbox kill <sandbox-id>
```

If this fails:
- Check `e2b auth login` was successful
- Verify API key in E2B dashboard
- Check internet connection

#### Test Docker

```bash
# Test Docker daemon
docker run hello-world

# Should download and run hello-world image

# Test Docker Compose
docker-compose --version

# Should show version 2.0+
```

If this fails:
- Ensure Docker Desktop is running
- Restart Docker Desktop
- Check Docker has enough resources (4GB RAM minimum)

#### Validate All API Keys

Create a test script `validate-keys.js`:

```javascript
// validate-keys.js
require('dotenv').config()

async function validateKeys() {
  console.log('Validating API keys...\n')

  // E2B
  if (process.env.E2B_API_KEY) {
    console.log('✅ E2B_API_KEY present')
  } else {
    console.error('❌ E2B_API_KEY missing')
  }

  // Gladia
  if (process.env.GLADIA_API_KEY) {
    console.log('✅ GLADIA_API_KEY present')
  } else {
    console.error('❌ GLADIA_API_KEY missing')
  }

  // HoneyHive
  if (process.env.HONEYHIVE_API_KEY) {
    console.log('✅ HONEYHIVE_API_KEY present')
  } else {
    console.error('❌ HONEYHIVE_API_KEY missing')
  }

  // Horizon3
  if (process.env.HORIZON3_API_KEY) {
    console.log('✅ HORIZON3_API_KEY present')
  } else {
    console.error('❌ HORIZON3_API_KEY missing')
  }

  // AI Gateway
  if (process.env.AI_GATEWAY_API_KEY) {
    console.log('✅ AI_GATEWAY_API_KEY present')

    // Verify models configured
    const models = [
      'AI_GATEWAY_DEFAULT_MODEL',
      'AI_GATEWAY_FAST_MODEL',
      'AI_GATEWAY_INSTANT_MODEL',
      'AI_GATEWAY_CODE_MODEL',
      'AI_GATEWAY_REASONING_MODEL'
    ]
    models.forEach(model => {
      if (process.env[model]) {
        console.log(`✅ ${model} configured`)
      }
    })
  } else {
    console.error('❌ AI_GATEWAY_API_KEY missing')
  }

  console.log('\nAll keys validated!')
}

validateKeys()
```

Run:
```bash
node validate-keys.js
```

All should show ✅. If any show ❌, add that key to `.env`.

## Common Pitfalls

### 1. **API Keys in Wrong Format**
- Ensure no extra spaces in `.env` file
- Format should be `KEY=value` (no spaces around =)
- No quotes needed unless value contains spaces

### 2. **Docker Not Running**
- Error: "Cannot connect to Docker daemon"
- Solution: Start Docker Desktop application

### 3. **E2B CLI Not Authenticated**
- Error: "Unauthorized"
- Solution: Run `e2b auth login` and paste API key

### 4. **Port Conflicts**
- Error: "Port 8000 already in use"
- Solution: Kill process using port or change port in config

### 5. **Git Commits Secrets**
- Check `.gitignore` includes `.env`
- Run `git status` to verify `.env` not tracked
- If accidentally committed: `git rm --cached .env && git commit --amend`

## Time Estimates by Task

| Task | Time | Can Parallelize? |
|------|------|------------------|
| Install dev tools | 1 hour | No |
| Obtain API keys | 30 min - 1 hour | No |
| Create project structure | 30 min | No |
| Create config files | 1 hour | No |
| Validate all systems | 1-2 hours | No |
| **TOTAL** | **4-6 hours** | |

## Next Steps

Once all success criteria are met, proceed to:

**[Phase 2: MCP Server Development](./PHASE_2.md)**

In Phase 2, you'll build all four MCP servers (Gladia, HoneyHive, Horizon3, Custom API) with functional tools and Docker containers.

Before moving on, ensure:
- [ ] All checkboxes in "Success Criteria" section are checked
- [ ] `.env` contains all API keys
- [ ] Can run `docker ps` and `e2b sandbox create` without errors
- [ ] README.md is complete and accurate

---

**Phase 1 Complete!** You now have a solid foundation. Time to build the MCP servers. 🚀
