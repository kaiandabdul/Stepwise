# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Stepwise** is a Live API Debugger Agent built using the Model Context Protocol (MCP) for the E2B + Docker MCP Hackathon. It provides conversational API debugging through voice/text input, multi-stage workflow orchestration across sponsor tools, and automated tracing.

### Core Capabilities
- Real-time API debugging via conversational interface (text + voice)
- Multi-tool orchestration: Gladia (STT), HoneyHive (observability), Horizon3.ai (security)
- Isolated execution in E2B cloud sandboxes with Docker containers
- LLM-powered workflow planning and parallel execution
- Automated documentation and HoneyHive tracing

## High-Level Architecture

### Three-Layer Architecture

1. **Frontend Layer** (Gradio interface)
   - Text input: API debugging commands
   - Voice input: Audio recording → Gladia transcription
   - Workflow visualization: Real-time step execution display

2. **Agent Layer** (Node.js/Python)
   - `StepwiseAgent`: Main orchestrator class
   - `WorkflowPlanner`: LLM-powered workflow generation from user input
   - `WorkflowExecutor`: Executes steps with dependency resolution (sequential + parallel)
   - `SandboxManager`: E2B sandbox lifecycle (create → start services → cleanup)
   - `MCPClient`: JSON-RPC 2.0 client for tool communication

3. **MCP Server Layer** (Docker containers in E2B sandbox)
   - **Gladia MCP** (port 8000): `transcribe_audio`, `get_supported_languages`
   - **HoneyHive MCP** (port 8001): `create_trace`, `log_event`, `log_metric`, `end_trace`
   - **Horizon3 MCP** (port 8002): `run_security_scan`, `get_scan_results`, `validate_permissions`
   - **Custom API MCP** (port 8003): `call_api` (generic HTTP client)

### Data Flow (Voice-to-API Example)

```
User records audio
  → Frontend uploads to Agent
    → Agent calls Gladia MCP (transcribe_audio)
      → LLM plans workflow from transcription
        → Executor creates E2B sandbox
          → Sandbox starts all MCP servers via docker-compose
            → Executor calls tools in dependency order
              → HoneyHive traces each step
                → Results returned to user
                  → Sandbox cleanup
```

### Key Architectural Decisions

- **Why MCP**: Standardizes tool integration, allows adding new APIs without agent changes
- **Why E2B + Docker**: Isolation (untrusted code execution), reproducibility, hackathon requirement
- **Why LLM for Planning**: Converts natural language to structured workflows with dependencies
- **Why Gradio**: Native audio input support, faster than custom React frontend

## Project Structure

```
Stepwise/
├── CLAUDE.md                       # This file - guidance for Claude Code
├── mcp-debugger-prd.md             # Original product requirements
│
├── docs/                           # Technical documentation (8 files)
│   ├── ARCHITECTURE.md             # System design, component interaction
│   ├── E2B_INTEGRATION.md          # E2B SDK usage, sandbox lifecycle
│   ├── MCP_SERVERS.md              # Complete MCP server implementations
│   ├── WORKFLOW_ORCHESTRATION.md   # Agent logic, LLM prompts, execution
│   ├── DOCKER_SETUP.md             # Dockerfiles, docker-compose.yml
│   ├── FRONTEND_GUIDE.md           # Gradio implementation
│   ├── SECURITY.md                 # Secrets management, log scrubbing
│   └── DEVELOPMENT_WORKFLOW.md     # Testing, debugging, deployment
│
├── phases/                         # 8-phase implementation guide (54-74 hrs)
│   ├── README.md                   # Phase overview, timeline, team structure
│   ├── PHASE_1.md                  # Environment setup, API keys
│   ├── PHASE_2.md                  # Build all 4 MCP servers
│   ├── PHASE_3.md                  # E2B template, docker-compose integration
│   ├── PHASE_4.md                  # Agent core, LLM integration, workflow engine
│   ├── PHASE_5.md                  # Gradio frontend
│   ├── PHASE_6.md                  # Security, input validation
│   ├── PHASE_7.md                  # Testing (unit, integration, E2E)
│   └── PHASE_8.md                  # Deployment, 3-min demo script
│
└── (implementation directories created during phases/)
    ├── agent/                      # Main agent application
    │   ├── src/
    │   │   ├── agent.js            # StepwiseAgent class
    │   │   ├── llm/                # LLM client, prompts
    │   │   ├── workflow/           # Planner, executor, state
    │   │   ├── e2b/                # SandboxManager, health checks
    │   │   ├── mcp/                # MCP client, tool registry
    │   │   └── api/                # Express/FastAPI endpoints
    │   └── tests/
    │
    ├── mcp-servers/                # All MCP servers
    │   ├── gladia/                 # Speech-to-text
    │   ├── honeyhive/              # Observability
    │   ├── horizon3/               # Security scanning
    │   └── custom-api/             # Generic HTTP client
    │
    ├── frontend/                   # Gradio interface
    │   └── app.py
    │
    ├── e2b-template/               # E2B custom template
    │   └── Dockerfile              # Docker + docker-compose preinstalled
    │
    ├── docker-compose.yml          # Local development
    └── docker-compose.prod.yml     # E2B sandbox deployment
```

## Development Workflow

### Initial Setup (Phase 1)

```bash
# Install dependencies
npm install -g @e2b/cli
e2b auth login

# Create project structure (see phases/PHASE_1.md)
mkdir -p agent/src/{llm,mcp,workflow,e2b,api}
mkdir -p mcp-servers/{gladia,honeyhive,horizon3,custom-api}
mkdir -p frontend e2b-template

# Configure environment
cp .env.example .env
# Edit .env with: E2B_API_KEY, GLADIA_API_KEY, HONEYHIVE_API_KEY,
#                 HORIZON3_API_KEY, OPENAI_API_KEY
```

### Local Development (without E2B)

```bash
# Terminal 1-4: Start each MCP server
cd mcp-servers/gladia && npm start      # Port 8000
cd mcp-servers/honeyhive && python src/server.py  # Port 8001
cd mcp-servers/horizon3 && npm start    # Port 8002
cd mcp-servers/custom-api && npm start  # Port 8003

# Terminal 5: Start agent
cd agent
export USE_E2B=false  # Use local MCP servers
npm start  # Port 3000

# Terminal 6: Start frontend
cd frontend && python app.py  # Port 7860
```

### With E2B Integration

```bash
# 1. Build E2B template (one-time, 5-10 min)
cd e2b-template
e2b template build --name stepwise-debugger
# Save template ID to .env: E2B_TEMPLATE_ID=<id>

# 2. Build Docker images for MCP servers
docker-compose build

# 3. Start agent (creates E2B sandbox automatically)
cd agent && npm start

# 4. Start frontend
cd frontend && python app.py
```

### Testing

```bash
# Unit tests
cd agent && npm test
cd mcp-servers/gladia && npm test

# Integration tests (MCP communication)
npm run test:integration

# E2E test (full workflow with E2B, requires credits)
npm run test:e2e

# Coverage
npm test -- --coverage
```

### Docker Commands

```bash
# Build all MCP server images
docker-compose build

# Start all services locally
docker-compose up -d

# Check service health
curl http://localhost:8000/health  # Gladia
curl http://localhost:8001/health  # HoneyHive
curl http://localhost:8002/health  # Horizon3
curl http://localhost:8003/health  # Custom API

# View logs
docker-compose logs -f gladia-mcp

# Stop all services
docker-compose down
```

### E2B Commands

```bash
# Create sandbox
e2b sandbox create --template stepwise-debugger

# List active sandboxes
e2b sandbox list

# Connect to sandbox (for debugging)
e2b sandbox connect <sandbox-id>

# Kill sandbox
e2b sandbox kill <sandbox-id>

# Check quota
e2b sandbox quota
```

## Implementation Guidance

### Follow the Phase Guide

**Critical**: Implement in order (Phases 1→2→3→4→5/6→7→8). See `phases/README.md` for:
- Detailed implementation steps with code examples
- Success criteria checklists
- Time estimates (54-74 hours total)
- Team coordination strategies

**Phase Dependencies**:
- Phase 3 (E2B) blocks Phase 4 (Agent)
- Phase 4 (Agent) blocks Phase 5 (Frontend)
- Phases 5 & 6 can be parallel
- Phase 7 (Testing) blocks Phase 8 (Demo)

### Key Implementation Files

When building, reference these docs files:

- **Agent orchestration**: `docs/WORKFLOW_ORCHESTRATION.md` - LLM prompts, dependency resolution, parallel execution
- **MCP server code**: `docs/MCP_SERVERS.md` - Complete implementations for all 4 servers
- **E2B integration**: `docs/E2B_INTEGRATION.md` - SandboxManager class, docker-compose upload, health checks
- **Security patterns**: `docs/SECURITY.md` - Input validation, log scrubbing, rate limiting
- **Testing strategies**: `docs/DEVELOPMENT_WORKFLOW.md` - Unit/integration/E2E test examples

### MCP Protocol Implementation

All MCP communication uses JSON-RPC 2.0:

```javascript
// List available tools
{ jsonrpc: "2.0", id: 1, method: "tools/list" }

// Call a tool
{
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: "transcribe_audio",
    arguments: { audioUrl: "...", language: "en" }
  }
}
```

MCP servers run on fixed ports (8000-8003) inside E2B sandbox. Agent communicates via HTTP to `http://localhost:<port>/mcp`.

### Workflow Dependency Resolution

Workflows have steps with dependencies. Example:

```javascript
{
  steps: [
    { id: "step-1", tool: "create_trace", dependencies: [] },
    { id: "step-2", tool: "call_api", dependencies: [] },  // Parallel with step-1
    { id: "step-3", tool: "log_event", dependencies: ["step-1", "step-2"] }  // Waits for both
  ]
}
```

Executor groups by dependency level, executes each level in parallel using `Promise.all()`.

### Environment Variables

Required in `.env`:
- `E2B_API_KEY` - E2B sandbox access
- `E2B_TEMPLATE_ID` - Custom template (created in Phase 3)
- `GLADIA_API_KEY` - Gladia speech-to-text
- `HONEYHIVE_API_KEY` - HoneyHive observability
- `HONEYHIVE_PROJECT` - Project name (default: "stepwise-agent")
- `HORIZON3_API_KEY` - Horizon3 security (optional, can use mocks)
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` - LLM provider

Optional flags:
- `USE_E2B=false` - Run locally without E2B sandboxes
- `HORIZON3_USE_MOCK=true` - Use mock data if Horizon3 API unavailable
- `LOG_LEVEL=debug` - Verbose logging

## Common Issues & Solutions

### E2B Sandbox Timeout
**Issue**: Sandbox creation or docker-compose startup times out
**Solution**: Increase timeout in agent config, use pre-built Docker images (not build in sandbox)

### MCP Tool Not Found
**Issue**: Agent can't find tool when calling MCP server
**Solution**: Check server is running (`docker-compose ps`), verify health endpoint, check tool name matches exactly

### Port Already in Use
**Issue**: Can't start MCP server, port conflict
**Solution**: Kill process using port (`lsof -ti:8000 | xargs kill`) or change port in config

### API Rate Limit
**Issue**: OpenAI/Gladia/etc. returns 429 error
**Solution**: Have backup API keys, reduce test frequency, cache LLM responses in development

### Docker Container Fails in E2B
**Issue**: Container starts locally but fails in E2B sandbox
**Solution**: Check E2B template has Docker installed, verify container runs as root (E2B limitation), increase memory limit

## Hackathon Demo Preparation

**3-Minute Demo Flow** (see `phases/PHASE_8.md`):

1. **Problem** (20s): Show traditional API debugging pain
2. **Solution** (20s): Explain architecture with diagram
3. **Live Demo** (2min):
   - Voice input: "Test JSONPlaceholder API user 1"
   - Show transcription (Gladia)
   - Show workflow execution (all steps)
   - Show HoneyHive trace
   - Run security scan (Horizon3)
4. **Wrap-up** (20s): Use cases, next steps

**Backup Plan**: Pre-recorded video if live demo fails

**Pre-Demo Checklist** (24 hours before):
- [ ] All API keys valid, sufficient quota
- [ ] E2B credits available (`e2b sandbox quota`)
- [ ] Deployed and accessible (Gradio public link or VM)
- [ ] Full workflow tested 3x
- [ ] Backup video recorded
- [ ] Demo script practiced

## Documentation Cross-Reference

- **Product Requirements**: `mcp-debugger-prd.md`
- **Implementation Phases**: `phases/PHASE_*.md` (start with PHASE_1)
- **Technical Deep Dives**: `docs/*.md` (architecture, E2B, MCP, security, etc.)

When implementing a feature, check the corresponding phase guide first, then reference the technical docs for implementation details.
