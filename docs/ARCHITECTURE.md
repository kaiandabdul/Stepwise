# ARCHITECTURE.md

## System Design & Component Interaction

### Table of Contents
1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Communication Patterns](#communication-patterns)
4. [Data Flow Diagrams](#data-flow-diagrams)
5. [Architectural Decisions](#architectural-decisions)
6. [Scalability Considerations](#scalability-considerations)
7. [Security Architecture](#security-architecture)

---

## 1. System Overview

**Stepwise** is a Live API Debugger Agent that combines the power of Large Language Models (LLMs), Model Context Protocol (MCP), E2B cloud sandboxes, and Docker containerization to create an intelligent, conversational API debugging and workflow orchestration system.

### Project Goals

1. **Rapid API Debugging**: Enable developers to debug APIs through natural language or voice commands
2. **Multi-Tool Orchestration**: Chain multiple API calls and tools in complex workflows
3. **Live Collaboration**: Support team debugging through shared sessions
4. **Automated Documentation**: Generate workflow documentation automatically
5. **Secure Execution**: Isolate all execution in ephemeral E2B sandboxes

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER                                   │
│                    (Developer)                                │
└────────────┬────────────────────────────┬───────────────────┘
             │ Text/Voice Input           │ Results/Docs
             ▼                            ▲
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Gradio)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │ Text Input   │  │ Audio Input  │  │ Workflow Viewer │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────┬────────────────────────────┬───────────────────┘
             │ HTTP/REST                  │
             ▼                            ▲
┌─────────────────────────────────────────────────────────────┐
│              AGENT HOST APPLICATION                          │
│  ┌────────────────────────────────────────────────────────┐│
│  │ LLM Integration (GPT-4/Claude)                          ││
│  │  - Intent parsing                                       ││
│  │  - Workflow planning                                    ││
│  │  - Result synthesis                                     ││
│  └────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────┐│
│  │ MCP Client                                              ││
│  │  - Tool discovery                                       ││
│  │  - Tool invocation                                      ││
│  │  - Context management                                   ││
│  └────────────────────────────────────────────────────────┘│
│  ┌────────────────────────────────────────────────────────┐│
│  │ Workflow Orchestrator                                   ││
│  │  - Step planning                                        ││
│  │  - Dependency resolution                                ││
│  │  - Error handling                                       ││
│  └────────────────────────────────────────────────────────┘│
└────────────┬────────────────────────────────────────────────┘
             │ E2B SDK
             ▼
┌─────────────────────────────────────────────────────────────┐
│           E2B CLOUD SANDBOX (Isolated Environment)          │
│  ┌────────────────────────────────────────────────────────┐│
│  │              Docker Compose Orchestration               ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ ││
│  │  │ Gladia MCP   │  │ HoneyHive    │  │ Horizon3.ai │ ││
│  │  │ Server       │  │ MCP Server   │  │ MCP Server  │ ││
│  │  │ (Speech-to-  │  │ (Observ-     │  │ (Security   │ ││
│  │  │  Text)       │  │  ability)    │  │  Scanning)  │ ││
│  │  └──────────────┘  └──────────────┘  └─────────────┘ ││
│  │  ┌──────────────┐                                      ││
│  │  │ Custom API   │                                      ││
│  │  │ MCP Server   │                                      ││
│  │  │ (Generic     │                                      ││
│  │  │  REST API)   │                                      ││
│  │  └──────────────┘                                      ││
│  └────────────────────────────────────────────────────────┘│
│                  Network: Isolated, Whitelisted             │
│                  Secrets: Injected at Runtime               │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼                                ▼
     ┌──────────────┐                ┌──────────────────┐
     │ External     │                │ Sponsor APIs     │
     │ APIs         │                │ - Gladia         │
     │ (User Target │                │ - HoneyHive      │
     │  APIs)       │                │ - Horizon3.ai    │
     └──────────────┘                └──────────────────┘
```

### Key Characteristics

- **Conversational Interface**: Text and voice input via Gradio frontend
- **Agent-Driven**: LLM reasons about user intent and plans workflows
- **MCP-Based Tool Access**: Standardized protocol for all external integrations
- **Isolated Execution**: Every session runs in an ephemeral E2B sandbox
- **Docker Containerized**: All MCP servers run as Docker containers
- **Observable**: All actions traced via HoneyHive
- **Secure**: Network isolation, secret management, and RBAC validation

---

## 2. Component Architecture

### 2.1 Agent Host Application

**Role**: Central orchestration hub that coordinates all components

**Technology**: Node.js (Express/Fastify) or Python (FastAPI)

**Responsibilities**:
- Parse user input (text or transcribed audio)
- Call LLM to understand intent and plan workflow
- Invoke MCP servers through MCP client
- Manage workflow state and context
- Handle errors and retries
- Generate documentation
- Return results to frontend

**Key Modules**:

```javascript
// agent-host/
├── src/
│   ├── llm/
│   │   ├── client.js           // LLM API client (OpenAI/Anthropic)
│   │   ├── prompts.js          // Prompt templates
│   │   └── parser.js           // Parse LLM responses
│   ├── mcp/
│   │   ├── client.js           // MCP client implementation
│   │   ├── tools.js            // Tool registry
│   │   └── context.js          // Context management
│   ├── workflow/
│   │   ├── planner.js          // Workflow planning logic
│   │   ├── executor.js         // Workflow execution engine
│   │   └── state.js            // State management
│   ├── e2b/
│   │   ├── sandbox.js          // E2B sandbox management
│   │   └── docker.js           // Docker orchestration in E2B
│   └── api/
│       ├── routes.js           // HTTP API endpoints
│       └── middleware.js       // Authentication, logging, etc.
├── package.json
└── Dockerfile
```

**API Endpoints**:
- `POST /query` - Submit text query
- `POST /query/audio` - Submit audio file
- `GET /session/:id` - Get session state
- `GET /logs/:sessionId` - Get session logs
- `GET /docs/:sessionId` - Get workflow documentation
- `WS /ws` - WebSocket for real-time updates

### 2.2 E2B Sandbox Environment

**Purpose**: Isolated, ephemeral cloud environment for running Docker containers

**Lifecycle**:
1. **Creation**: Spun up on demand when user starts a session
2. **Configuration**: Secrets injected, network restrictions applied
3. **Execution**: Docker containers started, workflows executed
4. **Cleanup**: Destroyed after session ends or timeout

**Configuration**:
```javascript
const sandbox = await Sandbox.create({
  template: 'base',              // Or custom template
  timeoutMs: 3600000,            // 1 hour
  envVars: {
    GLADIA_API_KEY: process.env.GLADIA_API_KEY,
    HONEYHIVE_API_KEY: process.env.HONEYHIVE_API_KEY,
    HORIZON3_API_KEY: process.env.HORIZON3_API_KEY
  },
  metadata: {
    sessionId: 'user-session-123',
    userId: 'user-456'
  }
})
```

**Resource Limits**:
- CPU: 2-4 cores
- Memory: 4-8 GB
- Disk: 10 GB ephemeral storage
- Network: Whitelisted domains only

**Security Features**:
- Network isolation (only whitelisted domains accessible)
- Filesystem isolation (read-only root filesystem)
- Process isolation (non-root user execution)
- Automatic cleanup on timeout or error

### 2.3 MCP Server Ecosystem

#### 2.3.1 Gladia MCP Server

**Purpose**: Speech-to-text transcription for voice input

**Tools Exposed**:
- `transcribe_audio(audioUrl, language)` - Transcribe audio file
- `transcribe_audio_streaming(audioStream)` - Real-time transcription (stretch)

**Technology**: Node.js or Python, Gladia API client

**Container**: `gladia-mcp-server:latest`

**Example Tool Definition**:
```json
{
  "name": "transcribe_audio",
  "description": "Transcribe audio to text using Gladia API",
  "inputSchema": {
    "type": "object",
    "properties": {
      "audioUrl": {
        "type": "string",
        "description": "URL or path to audio file"
      },
      "language": {
        "type": "string",
        "description": "Language code (e.g., 'en', 'es')",
        "default": "en"
      }
    },
    "required": ["audioUrl"]
  }
}
```

#### 2.3.2 HoneyHive MCP Server

**Purpose**: Observability, logging, and tracing for all agent actions

**Tools Exposed**:
- `log_trace(traceName, metadata)` - Create trace for workflow
- `log_event(eventName, metadata)` - Log individual events
- `log_metric(metricName, value, tags)` - Log custom metrics
- `get_traces(sessionId)` - Retrieve traces for analysis

**Technology**: Python, HoneyHive SDK, OpenTelemetry

**Container**: `honeyhive-mcp-server:latest`

**Integration Points**:
- Automatically log every workflow execution
- Trace each MCP tool call
- Record LLM token usage and costs
- Capture errors and warnings

#### 2.3.3 Horizon3.ai NodeZero MCP Server

**Purpose**: Security scanning and RBAC validation

**Tools Exposed**:
- `run_security_scan(target, scanType)` - Run security scan on API
- `validate_permissions(userId, resource, action)` - Validate RBAC permissions
- `get_scan_results(scanId)` - Retrieve scan results

**Technology**: Node.js or Python, Horizon3.ai API client

**Container**: `horizon3-mcp-server:latest`

**Use Cases**:
- Pre-deployment security checks
- API vulnerability scanning
- RBAC permission validation
- Security compliance reporting

#### 2.3.4 Custom REST API MCP Server

**Purpose**: Generic HTTP client for debugging arbitrary REST APIs

**Tools Exposed**:
- `call_api(method, url, headers, body)` - Make HTTP request
- `parse_openapi_spec(specUrl)` - Parse OpenAPI/Swagger spec (stretch)

**Technology**: Node.js (axios) or Python (requests)

**Container**: `custom-api-mcp-server:latest`

**Features**:
- Support all HTTP methods (GET, POST, PUT, DELETE, etc.)
- Custom headers and authentication
- Request/response logging
- Error parsing and suggestions

### 2.4 Frontend Interface

**Technology**: Gradio (recommended for audio support)

**Features**:
- **Text Input**: Textarea for typing debugging queries
- **Audio Input**: Microphone recording or file upload
- **Workflow Viewer**: Real-time display of workflow steps
- **Results Display**: Formatted API responses and errors
- **Documentation Export**: Download auto-generated docs

**Layout**:
```python
with gr.Blocks() as demo:
    gr.Markdown("# Live API Debugger Agent")

    with gr.Tab("Text Input"):
        text_input = gr.Textbox(label="Describe your API debugging task", lines=3)
        text_output = gr.Textbox(label="Results", lines=10)
        text_button = gr.Button("Submit")

    with gr.Tab("Voice Input"):
        audio_input = gr.Audio(source="microphone", type="filepath")
        audio_output = gr.Textbox(label="Results", lines=10)
        audio_button = gr.Button("Submit")

    with gr.Tab("Workflow"):
        workflow_viewer = gr.Markdown(label="Workflow Steps")

    with gr.Tab("Logs"):
        logs_viewer = gr.Textbox(label="Session Logs", lines=20)
```

---

## 3. Communication Patterns

### 3.1 MCP Protocol Implementation

**Model Context Protocol (MCP)** is a JSON-RPC 2.0 based protocol that standardizes communication between AI applications and external tools.

#### MCP Client-Server Model

```
┌──────────────┐                    ┌──────────────┐
│  MCP Client  │                    │  MCP Server  │
│ (Agent Host) │                    │   (Tool)     │
└──────┬───────┘                    └──────┬───────┘
       │                                   │
       │ 1. Initialize Connection          │
       │──────────────────────────────────▶│
       │                                   │
       │ 2. List Tools Request             │
       │──────────────────────────────────▶│
       │                                   │
       │ 3. Tools List Response            │
       │◀──────────────────────────────────│
       │                                   │
       │ 4. Call Tool Request              │
       │──────────────────────────────────▶│
       │                                   │
       │ 5. Tool Execution                 │
       │                  [Server executes]│
       │                                   │
       │ 6. Tool Result Response           │
       │◀──────────────────────────────────│
       │                                   │
       │ 7. Close Connection               │
       │──────────────────────────────────▶│
       └───────────────────────────────────┘
```

#### JSON-RPC Message Format

**List Tools Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**List Tools Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "transcribe_audio",
        "description": "Transcribe audio to text",
        "inputSchema": {
          "type": "object",
          "properties": {
            "audioUrl": {"type": "string"}
          }
        }
      }
    ]
  }
}
```

**Call Tool Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "transcribe_audio",
    "arguments": {
      "audioUrl": "https://example.com/audio.mp3",
      "language": "en"
    }
  }
}
```

**Call Tool Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"transcription\": \"Debug the authentication endpoint\"}"
      }
    ]
  }
}
```

#### Transport Layers

**STDIO (Standard Input/Output)**:
- Used for local MCP servers
- Process-based communication
- Lower latency
- **Used in this project**: For communication between agent host and MCP servers in E2B sandbox

**HTTP/SSE (Server-Sent Events)**:
- Used for remote MCP servers
- HTTP-based communication
- Supports streaming responses
- **Potential use**: For exposing agent over network (stretch goal)

### 3.2 Docker Container Communication

**Within E2B Sandbox**:

```
┌──────────────────────────────────────────────────────┐
│           E2B Sandbox Network (Bridge)                │
│                                                        │
│  ┌──────────────┐      ┌──────────────┐             │
│  │ Agent Host   │◀────▶│ Gladia MCP   │             │
│  │ (Docker      │      │ Server       │             │
│  │  Container)  │      │ (Container)  │             │
│  └──────┬───────┘      └──────────────┘             │
│         │                                             │
│         │              ┌──────────────┐              │
│         ├─────────────▶│ HoneyHive    │              │
│         │              │ MCP Server   │              │
│         │              └──────────────┘              │
│         │                                             │
│         │              ┌──────────────┐              │
│         └─────────────▶│ Horizon3 MCP │              │
│                        │ Server       │              │
│                        └──────────────┘              │
└──────────────────────────────────────────────────────┘
```

**Service Discovery**:
- Docker Compose provides DNS resolution
- Services accessible by container name: `http://gladia-mcp:8000`
- No need for IP addresses

**Port Mapping**:
- Internal ports: Used for inter-container communication
- External ports: Exposed only for agent host (for frontend access)

**Volume Sharing**:
```yaml
volumes:
  - shared-data:/app/data

services:
  agent:
    volumes:
      - shared-data:/app/data
  gladia-mcp:
    volumes:
      - shared-data:/app/data
```

### 3.3 Environment Variable Injection

**Flow**:
```
User's .env file
    ↓
Agent Host Process (dotenv loaded)
    ↓
E2B Sandbox Creation (envVars passed)
    ↓
Docker Containers (environment variables injected)
    ↓
MCP Servers (access via process.env or os.getenv)
```

**Example**:
```javascript
// Agent Host
import { Sandbox } from '@e2b/sdk'
import dotenv from 'dotenv'

dotenv.config()

const sandbox = await Sandbox.create({
  envVars: {
    GLADIA_API_KEY: process.env.GLADIA_API_KEY,
    HONEYHIVE_API_KEY: process.env.HONEYHIVE_API_KEY
  }
})

// Inside Gladia MCP Server Container
const apiKey = process.env.GLADIA_API_KEY
```

---

## 4. Data Flow Diagrams

### 4.1 Single API Call Flow

```
User → Frontend → Agent Host → LLM → Workflow Planner
                                        ↓
                          ┌─────────────┴──────────────┐
                          │ Workflow:                   │
                          │ 1. Call API                 │
                          │ 2. Log to HoneyHive         │
                          └─────────────┬──────────────┘
                                        ↓
                          MCP Client (in Agent Host)
                                        ↓
                          E2B Sandbox
                          ┌─────────────┴──────────────┐
                          ▼                            ▼
               Custom API MCP Server        HoneyHive MCP Server
                          │                            │
                          ▼                            ▼
                  External API                  HoneyHive API
                  (https://api.example.com)     (Logging)
                          │                            │
                          └──────────┬─────────────────┘
                                     ▼
                              Results Collected
                                     ▼
                              Agent Host
                                     ▼
                               LLM (Summarize)
                                     ▼
                                 Frontend
                                     ▼
                                   User
```

**Step-by-Step**:
1. User enters: "Test POST /users endpoint at api.example.com"
2. Frontend sends to Agent Host: `POST /query`
3. Agent Host calls LLM to parse intent
4. LLM responds: "Call POST api.example.com/users and log results"
5. Workflow Planner creates steps:
   - Step 1: `call_api(method='POST', url='api.example.com/users')`
   - Step 2: `log_event(eventName='api_test', metadata={...})`
6. MCP Client calls Custom API MCP Server
7. Custom API MCP Server makes HTTP request to target API
8. Results returned to Agent Host
9. MCP Client calls HoneyHive MCP Server to log event
10. All results collected and sent to LLM for summarization
11. Summary returned to Frontend
12. User sees formatted results

### 4.2 Voice-to-API Workflow

```
User (speaks)
    ↓
Microphone → Frontend (Gradio Audio Input)
    ↓
Audio File Uploaded
    ↓
Agent Host receives audio file
    ↓
Workflow Step 1: Transcribe Audio
    ↓
MCP Client → Gladia MCP Server
    ↓
Gladia API (Speech-to-Text)
    ↓
Transcription: "Debug the authentication endpoint"
    ↓
Workflow Step 2: Extract API Details (LLM)
    ↓
LLM parses: method=GET, endpoint=/auth/login
    ↓
Workflow Step 3: Call API
    ↓
MCP Client → Custom API MCP Server
    ↓
HTTP Request to target API
    ↓
Response: 401 Unauthorized
    ↓
Workflow Step 4: Log to HoneyHive
    ↓
MCP Client → HoneyHive MCP Server
    ↓
Event logged with trace
    ↓
Workflow Step 5: Analyze Error (LLM)
    ↓
LLM suggests: "Check authentication headers"
    ↓
Results returned to User
```

### 4.3 Multi-Tool Security Workflow

```
User: "Debug my API and run a security scan"
    ↓
Agent Host
    ↓
Workflow Planner:
    ┌──────────────────────────────────────┐
    │ Step 1: Call API (test endpoint)     │
    │ Step 2: Run Security Scan (parallel) │
    │ Step 3: Log Both Results             │
    └──────────────────────────────────────┘
    ↓
Parallel Execution:
    ┌─────────────────┬─────────────────┐
    ▼                 ▼                 ▼
Custom API MCP   Horizon3 MCP   (Wait for both)
    │                 │
    ▼                 ▼
Target API      Horizon3.ai API
    │                 │
    └────────┬────────┘
             ▼
      Results Merged
             ▼
    HoneyHive MCP Server
             ▼
    Log Combined Trace
             ▼
    LLM Synthesis
             ▼
   "API returned 200, but security scan found 2 vulnerabilities"
             ▼
          User
```

### 4.4 Error Handling Flow

```
Workflow Execution
    ↓
Step 1: Call API
    ↓
[Error: Timeout]
    ↓
Error Handler
    ├─▶ Log Error to HoneyHive
    ├─▶ Check Retry Policy
    │   ├─▶ Retry with exponential backoff
    │   └─▶ If max retries exceeded:
    │       └─▶ Ask LLM for Alternative
    │           ├─▶ Suggest different endpoint
    │           ├─▶ Suggest checking API status
    │           └─▶ Abort workflow
    └─▶ Return Partial Results
        └─▶ "Completed 2/3 steps, step 2 failed: timeout"
```

---

## 5. Architectural Decisions

### 5.1 Why MCP?

**Problem**: Traditional approach requires custom integration code for every tool or API

**Solution**: MCP provides a universal protocol for tool integration

**Benefits**:
- **Standardization**: One interface for all tools
- **Composability**: Tools can be mixed and matched
- **Context Management**: MCP handles context passing automatically
- **Vendor Neutrality**: Not tied to specific LLM or platform

**Trade-offs**:
- Learning curve for MCP protocol
- Additional abstraction layer
- **Decision**: Benefits outweigh costs for hackathon, especially with multiple sponsor tools

### 5.2 Why E2B + Docker?

**Problem**: Need isolated, reproducible execution environment

**Solution**: E2B provides cloud sandboxes, Docker provides containerization

**Benefits**:
- **Isolation**: Each session completely isolated
- **Security**: Network restrictions, resource limits
- **Reproducibility**: Same Docker images work everywhere
- **Ease of Demo**: Judges can run without local setup

**Trade-offs**:
- Cost of E2B API usage
- Startup latency for sandbox creation (~5-10 seconds)
- **Decision**: Essential for security and hackathon demo requirements

### 5.3 Why Gradio over Streamlit?

**Problem**: Need rapid prototyping with audio input support

**Solution**: Gradio has native audio input components

**Comparison**:
| Feature | Gradio | Streamlit |
|---------|--------|-----------|
| Audio Input | ✅ Native | ❌ Requires custom component |
| Learning Curve | ✅ Simpler | ⚠️ Moderate |
| Customization | ⚠️ Limited | ✅ More flexible |
| Deployment | ✅ Easy | ✅ Easy |

**Decision**: Gradio for audio-first interface, can switch to Streamlit if more customization needed

### 5.4 LLM Selection

**Options**:
- OpenAI GPT-4 / GPT-4o
- Anthropic Claude Sonnet/Opus
- Google Gemini

**Decision**: Support multiple LLMs via abstraction layer

```javascript
class LLMClient {
  constructor(provider, apiKey) {
    this.provider = provider  // 'openai', 'anthropic', 'google'
    this.apiKey = apiKey
  }

  async complete(prompt) {
    switch(this.provider) {
      case 'openai':
        return await this.openaiComplete(prompt)
      case 'anthropic':
        return await this.anthropicComplete(prompt)
      // ...
    }
  }
}
```

**Rationale**: Flexibility, cost optimization, redundancy

### 5.5 State Management

**Problem**: Need to maintain context across workflow steps and sessions

**Solution**: Hybrid approach
- **In-Memory**: Current workflow state (fast access)
- **Persistent**: Session history in HoneyHive (long-term storage)
- **Shared**: Context passed through MCP protocol

**Architecture**:
```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map()  // In-memory cache
    this.honeyhive = new HoneyHiveClient()  // Persistent storage
  }

  async getSession(sessionId) {
    if (this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)
    }
    // Load from HoneyHive if not in memory
    return await this.honeyhive.getSession(sessionId)
  }
}
```

### 5.6 Workflow Execution Model

**Options**:
1. Sequential execution (one step at a time)
2. Parallel execution (independent steps run concurrently)
3. Hybrid (sequential when dependencies exist, parallel otherwise)

**Decision**: Hybrid approach

**Implementation**:
```javascript
async function executeWorkflow(steps) {
  const levels = groupByDependencyLevel(steps)

  for (const levelSteps of levels) {
    // Execute all steps at this level in parallel
    await Promise.all(
      levelSteps.map(step => executeStep(step))
    )
  }
}
```

**Rationale**: Maximizes performance while respecting dependencies

---

## 6. Scalability Considerations

### 6.1 Current Architecture (Hackathon MVP)

- **Sessions**: Single-user, sequential
- **E2B Sandboxes**: One per session
- **MCP Servers**: New containers per sandbox
- **Expected Load**: 5-10 concurrent users (demo)

### 6.2 Scaling Strategies (Post-Hackathon)

#### Horizontal Scaling

**Agent Host**:
```
Load Balancer
    ├─▶ Agent Host Instance 1
    ├─▶ Agent Host Instance 2
    └─▶ Agent Host Instance 3
```

**Session Affinity**: Use sticky sessions or shared Redis for state

#### E2B Sandbox Pooling

**Problem**: Sandbox creation takes 5-10 seconds

**Solution**: Pre-warm sandbox pool
```javascript
class SandboxPool {
  constructor(poolSize = 5) {
    this.pool = []
    this.poolSize = poolSize
    this.warmPool()
  }

  async warmPool() {
    while (this.pool.length < this.poolSize) {
      const sandbox = await Sandbox.create()
      this.pool.push(sandbox)
    }
  }

  async getSandbox() {
    if (this.pool.length > 0) {
      const sandbox = this.pool.pop()
      this.warmPool()  // Refill pool asynchronously
      return sandbox
    }
    return await Sandbox.create()
  }
}
```

#### Caching

**LLM Response Caching**:
- Cache common queries (e.g., "test POST /users")
- Use semantic similarity for cache lookup
- TTL: 1 hour

**MCP Tool Result Caching**:
- Cache idempotent operations
- Invalidate on parameter changes

#### Rate Limiting

```javascript
const rateLimit = {
  windowMs: 60 * 1000,  // 1 minute
  max: 10,  // 10 requests per minute per user
  keyGenerator: (req) => req.user.id
}
```

#### Cost Optimization

- Use smaller LLM models for non-critical tasks
- Batch HoneyHive logging calls
- Terminate idle E2B sandboxes aggressively
- Monitor API usage and set budgets

---

## 7. Security Architecture

### 7.1 Threat Model

**Assets**:
- User API keys and credentials
- Session data and logs
- Agent infrastructure

**Threats**:
- Malicious user input (code injection, XSS)
- Unauthorized access to other users' sessions
- API key extraction
- Container escape
- DDoS attacks

### 7.2 Security Layers

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Input Validation                           │
│ - Sanitize user input                               │
│ - Validate URLs, API keys                           │
│ - Rate limiting                                     │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│ Layer 2: Authentication & Authorization             │
│ - User authentication (JWT/OAuth)                   │
│ - Session validation                                │
│ - RBAC checks via Horizon3.ai                       │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│ Layer 3: Network Isolation (E2B Sandbox)            │
│ - Whitelist allowed domains                         │
│ - Block private IP ranges                           │
│ - Firewall rules                                    │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│ Layer 4: Container Isolation (Docker)               │
│ - Non-root user execution                           │
│ - Read-only filesystem                              │
│ - Resource limits (CPU, memory)                     │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│ Layer 5: Secrets Management                         │
│ - Environment variable injection                    │
│ - No secrets in code or logs                        │
│ - Secret rotation                                   │
└─────────────────┬───────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────────────────┐
│ Layer 6: Audit Logging                              │
│ - All actions logged to HoneyHive                   │
│ - Sensitive data scrubbed                           │
│ - Immutable audit trail                             │
└─────────────────────────────────────────────────────┘
```

### 7.3 Security Boundaries

**Trust Boundaries**:
1. **User ↔ Frontend**: HTTPS, CORS, input validation
2. **Frontend ↔ Agent Host**: Authentication, rate limiting
3. **Agent Host ↔ E2B Sandbox**: E2B API authentication
4. **Sandbox ↔ MCP Servers**: Internal network, no external exposure
5. **MCP Servers ↔ External APIs**: Network whitelist, secret injection

**Isolation Guarantees**:
- Each user session gets a separate E2B sandbox
- No shared state between sessions
- Sandboxes destroyed on completion or timeout
- Network isolation prevents lateral movement

### 7.4 Compliance Considerations

**Data Privacy**:
- Log scrubbing for PII (emails, API keys, passwords)
- User data stored only for session duration
- GDPR compliance (data deletion requests)

**Security Standards**:
- Use Horizon3.ai NodeZero for continuous security scanning
- Regular vulnerability assessments
- Secure coding practices (input validation, parameterized queries)

---

## Conclusion

This architecture provides a robust, scalable, and secure foundation for the Stepwise Live API Debugger Agent. By combining MCP's standardized tool integration, E2B's isolated execution environment, and Docker's containerization, we achieve:

- **Rapid Development**: Plug-and-play sponsor tool integration
- **Security**: Multi-layered isolation and secrets management
- **Observability**: Full tracing via HoneyHive
- **Hackathon-Ready**: Easy to demo and deploy

Next steps: Proceed to implementation guides in E2B_INTEGRATION.md and MCP_SERVERS.md.
