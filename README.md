# Stepwise: Live API Debugger Agent

A conversational API debugging system built with the Model Context Protocol (MCP), designed for the E2B + Docker MCP Hackathon.

## Overview

**Stepwise** provides real-time API debugging through a conversational interface with:
- Voice and text input for API debugging commands
- Multi-tool orchestration (Gladia, HoneyHive, Horizon3)
- Isolated execution in E2B cloud sandboxes
- Automated workflow planning and parallel execution
- Integrated observability and security scanning

## Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0 and npm >= 9.0.0
- **Python** >= 3.10 with pip
- **Docker** >= 20.0.0 and Docker Compose >= 2.0.0
- **Git**

Required API keys (sign up at each service):
- [ ] E2B API key: https://e2b.dev
- [ ] Gladia API key: https://gladia.io
- [ ] HoneyHive API key: https://honeyhive.ai
- [ ] Horizon3 API key: https://horizon3.ai (optional, can use mocks)
- [ ] Vercel AI Gateway key: https://vercel.com/docs/ai-gateway (unified LLM access)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Stepwise
   ```

2. **Install dependencies:**
   ```bash
   npm run setup
   # This runs: npm install && python -m pip install -r requirements.txt
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   nano .env  # or your preferred editor
   ```

   Fill in all required API keys:
   ```
   E2B_API_KEY=your_key_here
   GLADIA_API_KEY=your_key_here
   HONEYHIVE_API_KEY=your_key_here
   HORIZON3_API_KEY=your_key_here
   AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key_here
   ```

4. **Validate configuration:**
   ```bash
   npm run validate:config
   ```
   This script checks all API keys and connectivity.

### Running Locally (Without E2B)

Start all MCP servers and the agent in separate terminals:

```bash
# Terminal 1: Gladia MCP (Speech-to-text) - Port 8000
npm run mcp:gladia

# Terminal 2: HoneyHive MCP (Observability) - Port 8001
npm run mcp:honeyhive

# Terminal 3: Horizon3 MCP (Security) - Port 8002
npm run mcp:horizon3

# Terminal 4: Custom API MCP - Port 8003
npm run mcp:custom-api

# Terminal 5: Agent Server - Port 3000
npm start

# Terminal 6: Frontend (Gradio) - Port 7860
cd frontend && python app.py
```

Set `USE_E2B=false` in `.env` to use local MCP servers instead of E2B.

### Running with Docker

```bash
# Build all MCP server containers
npm run docker:build

# Start all services
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### With E2B Integration (Full Setup)

1. **Create E2B template:**
   ```bash
   cd e2b-template
   e2b template build --name stepwise-debugger
   # Copy the template ID and add to .env: E2B_TEMPLATE_ID=<id>
   ```

2. **Start the agent:**
   ```bash
   npm start
   ```
   The agent will automatically create E2B sandboxes for each workflow.

3. **Access the frontend:**
   Open http://localhost:7860 in your browser.

## Project Structure

```
Stepwise/
├── README.md                          # This file
├── CLAUDE.md                          # Development guidance for Claude Code
├── package.json                       # Node.js dependencies
├── requirements.txt                   # Python dependencies
├── .env.example                       # Environment template
├── .gitignore                         # Git configuration
│
├── agent/                             # Main agent application
│   ├── src/
│   │   ├── index.js                   # Entry point
│   │   ├── agent.js                   # StepwiseAgent orchestrator
│   │   ├── llm/                       # LLM integration
│   │   ├── workflow/                  # Workflow planner & executor
│   │   ├── e2b/                       # E2B sandbox management
│   │   ├── mcp/                       # MCP client & tool registry
│   │   ├── api/                       # Express API endpoints
│   │   └── security/                  # Input validation, log scrubbing
│   └── tests/                         # Unit & integration tests
│
├── mcp-servers/                       # All MCP server implementations
│   ├── gladia/                        # Speech-to-text MCP server
│   │   ├── src/
│   │   │   ├── server.js              # Server entry point
│   │   │   ├── tools.js               # Tool definitions
│   │   │   └── gladia-client.js       # Gladia API client
│   │   └── tests/
│   ├── honeyhive/                     # Observability MCP server
│   │   ├── src/
│   │   │   ├── server.py
│   │   │   ├── tools.py
│   │   │   └── honeyhive_client.py
│   │   └── tests/
│   ├── horizon3/                      # Security scanning MCP server
│   │   ├── src/
│   │   │   ├── server.js
│   │   │   ├── tools.js
│   │   │   └── horizon3-client.js
│   │   └── tests/
│   └── custom-api/                    # Generic HTTP client MCP server
│       ├── src/
│       │   ├── server.js
│       │   ├── tools.js
│       │   └── api-client.js
│       └── tests/
│
├── frontend/                          # Gradio web interface
│   ├── app.py                         # Main Gradio application
│   ├── components/                    # UI components
│   └── assets/                        # Images, styles, etc.
│
├── e2b-template/                      # Custom E2B template
│   └── Dockerfile                     # Template with Docker + docker-compose
│
├── scripts/                           # Utility scripts
│   └── validate-config.js             # Configuration validation
│
└── docs/                              # Technical documentation
    ├── ARCHITECTURE.md
    ├── E2B_INTEGRATION.md
    ├── MCP_SERVERS.md
    ├── WORKFLOW_ORCHESTRATION.md
    ├── DOCKER_SETUP.md
    ├── FRONTEND_GUIDE.md
    ├── SECURITY.md
    └── DEVELOPMENT_WORKFLOW.md
```

## API Key Setup Instructions

### E2B (Cloud Sandbox)

1. Go to https://e2b.dev and sign up
2. Navigate to dashboard → API Keys
3. Create a new API key and copy it
4. Add to `.env`: `E2B_API_KEY=<your_key>`

**Verify:**
```bash
npm install -g @e2b/cli
e2b auth login
e2b sandbox list
```

### Gladia (Speech-to-Text)

1. Go to https://gladia.io and sign up
2. Create a new project and generate an API key
3. Add to `.env`: `GLADIA_API_KEY=<your_key>`

**Verify:**
```bash
curl -X POST https://api.gladia.io/v2/health \
  -H "Authorization: Bearer <your_key>"
```

### HoneyHive (Observability)

1. Go to https://honeyhive.ai and create an account
2. Create a project (or use default)
3. Generate API key from settings
4. Add to `.env`:
   ```
   HONEYHIVE_API_KEY=<your_key>
   HONEYHIVE_PROJECT=stepwise-agent
   ```

**Verify:**
```bash
curl https://api.honeyhive.ai/v1/projects \
  -H "Authorization: Bearer <your_key>"
```

### Horizon3 (Security)

1. Go to https://horizon3.ai and sign up
2. Create API key from dashboard
3. Add to `.env`: `HORIZON3_API_KEY=<your_key>`

**Optional:** For development without Horizon3, set `HORIZON3_USE_MOCK=true`

### Vercel AI Gateway (LLM Access)

Stepwise uses Vercel AI Gateway for unified access to multiple LLM providers (OpenAI and Anthropic) through a single API.

1. Sign up at https://vercel.com
2. Navigate to your project → AI Gateway section
3. Generate an API key
4. Add to `.env`: `AI_GATEWAY_API_KEY=<your_key>`

**Model Configuration:**
Stepwise uses 5 specific models (configured via environment variables):
- `anthropic/claude-haiku-4.5` - Fast responses (default for quick tasks)
- `anthropic/claude-sonnet-4.5` - Balanced general-purpose (default)
- `openai/gpt-5.1-instant` - Instant OpenAI responses
- `openai/gpt-5.1-codex` - Code-focused tasks
- `openai/gpt-5.1-thinking` - Complex reasoning

See `docs/AI_GATEWAY_INTEGRATION.md` for complete configuration guide.

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Integration tests (MCP communication)
npm run test:integration

# End-to-end tests (with E2B)
npm run test:e2e

# Coverage report
npm run test:coverage
```

## Documentation

See the `docs/` directory for detailed information:

- **ARCHITECTURE.md** - System design and component interaction
- **E2B_INTEGRATION.md** - E2B SDK usage and sandbox lifecycle
- **MCP_SERVERS.md** - Complete MCP server implementations
- **WORKFLOW_ORCHESTRATION.md** - Agent logic and execution engine
- **DOCKER_SETUP.md** - Docker and docker-compose configuration
- **FRONTEND_GUIDE.md** - Gradio interface implementation
- **SECURITY.md** - Security practices and validation
- **DEVELOPMENT_WORKFLOW.md** - Development tips and debugging

## Implementation Phases

This project is structured as 8 phases (54-74 hours total):

1. **Phase 1:** Environment setup & configuration (you are here)
2. **Phase 2:** Build all 4 MCP servers
3. **Phase 3:** E2B template & docker-compose integration
4. **Phase 4:** Agent core, LLM integration, workflow engine
5. **Phase 5:** Gradio frontend
6. **Phase 6:** Security & input validation
7. **Phase 7:** Testing (unit, integration, E2E)
8. **Phase 8:** Deployment & demo script

See `phases/` directory for detailed phase guides.

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `E2B_API_KEY` | Yes | API key for E2B sandbox | `e2b_xxx...` |
| `E2B_TEMPLATE_ID` | Conditional | Template ID (if using E2B) | `e2b_tmpl_xxx...` |
| `GLADIA_API_KEY` | Yes | Gladia speech-to-text API key | `gladia_xxx...` |
| `HONEYHIVE_API_KEY` | Yes | HoneyHive observability API key | `hhv_xxx...` |
| `HONEYHIVE_PROJECT` | Yes | HoneyHive project name | `stepwise-agent` |
| `HORIZON3_API_KEY` | Conditional | Horizon3 security scanning key | `h3_xxx...` |
| `HORIZON3_USE_MOCK` | No | Use mock Horizon3 data | `true/false` |
| `AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway (unified LLM access) | `vag_xxx...` |
| `AI_GATEWAY_BASE_URL` | No | AI Gateway URL (defaults to Vercel) | `https://ai-gateway.vercel.sh/v1` |
| `AI_GATEWAY_DEFAULT_MODEL` | No | Default LLM model | `anthropic/claude-sonnet-4.5` |
| `AI_GATEWAY_FAST_MODEL` | No | Fast LLM model | `anthropic/claude-haiku-4.5` |
| `AI_GATEWAY_INSTANT_MODEL` | No | Instant LLM model | `openai/gpt-5.1-instant` |
| `AI_GATEWAY_CODE_MODEL` | No | Code LLM model | `openai/gpt-5.1-codex` |
| `AI_GATEWAY_REASONING_MODEL` | No | Reasoning LLM model | `openai/gpt-5.1-thinking` |
| `USE_E2B` | No | Enable E2B sandboxes | `true/false` |
| `LOG_LEVEL` | No | Logging verbosity | `debug/info/warn/error` |
| `PORT` | No | Agent server port | `3000` |
| `FRONTEND_PORT` | No | Gradio frontend port | `7860` |

## Troubleshooting

### "API key is invalid"
- Verify the key is correct in `.env`
- Check that the key has appropriate permissions
- Ensure the API service is not rate limited

### "Port already in use"
```bash
# Find process using port (e.g., 8000)
lsof -ti:8000 | xargs kill -9
```

### "E2B sandbox creation timeout"
- Check E2B API key and quota: `e2b sandbox quota`
- Increase timeout in agent configuration
- Ensure E2B service is accessible

### "MCP server not responding"
```bash
# Verify server is running and responding
curl http://localhost:8000/health  # Gladia
curl http://localhost:8001/health  # HoneyHive
curl http://localhost:8002/health  # Horizon3
curl http://localhost:8003/health  # Custom API
```

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or contributions:
1. Check the docs/ directory
2. Review the phases/ implementation guides
3. Check existing issues on GitHub
4. Create a new issue with detailed description

## Hackathon Details

This project is being built for the **E2B + Docker MCP Hackathon**.

Key Features:
- Integration with E2B code execution sandboxes
- Multi-container MCP server deployment
- Real-time API debugging workflow
- Integrated security scanning and observability

**Demo Video:** (Link to be added)
