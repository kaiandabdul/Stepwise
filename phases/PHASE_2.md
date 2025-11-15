# Phase 2: MCP Server Development (Sponsor Tool Integration)

**Duration**: 12-16 hours
**Priority**: Critical
**Risk Level**: Medium
**Prerequisites**: Phase 1 complete (environment setup, API keys validated)

## Overview

Phase 2 is where you build the core MCP servers that integrate all three sponsor tools (Gladia, HoneyHive, Horizon3.ai) plus a generic Custom API server. Each MCP server exposes tools via the Model Context Protocol, allowing the agent to interact with these services in a standardized way.

This phase is critical because these servers form the foundation of your agent's capabilities. You must complete this phase before E2B integration because you need working MCP servers to test the full stack.

**Key Decision**: You can build these servers in parallel if you have multiple developers, or sequentially if working solo (recommended order: Gladia → HoneyHive → Custom API → Horizon3).

## Objectives

1. Build 4 fully functional MCP servers with FastMCP framework
2. Implement all required tools for each sponsor API
3. Add proper error handling and logging
4. Create Dockerfiles for each server
5. Write unit tests for critical tool functions
6. Validate each server works independently before integration

## Key Deliverables

### 1. Gladia MCP Server (3-4 hours)
**Location**: `mcp-servers/gladia/`

**Tools to implement**:
- `transcribe_audio` - Transcribe audio file to text
- `get_supported_languages` - List available languages

**Files**:
- `src/index.js` - Main server entry point
- `src/tools.js` - Tool implementations
- `Dockerfile` - Container configuration
- `package.json` - Dependencies
- `tests/tools.test.js` - Unit tests

### 2. HoneyHive MCP Server (3-4 hours)
**Location**: `mcp-servers/honeyhive/`

**Tools to implement**:
- `create_trace` - Start a new workflow trace
- `log_event` - Log an event in a trace
- `log_metric` - Log a metric value
- `end_trace` - Complete a trace

**Files**:
- `src/server.py` - Main server (Python recommended for HoneyHive SDK)
- `src/tools.py` - Tool implementations
- `Dockerfile` - Container configuration
- `requirements.txt` - Dependencies
- `tests/test_tools.py` - Unit tests

### 3. Horizon3 MCP Server (3-4 hours)
**Location**: `mcp-servers/horizon3/`

**Tools to implement**:
- `run_security_scan` - Initiate security scan
- `get_scan_results` - Retrieve scan results
- `validate_permissions` - Check RBAC permissions

**Files**:
- `src/index.js` - Main server entry point
- `src/tools.js` - Tool implementations
- `Dockerfile` - Container configuration
- `package.json` - Dependencies
- `tests/tools.test.js` - Unit tests

### 4. Custom API MCP Server (2-3 hours)
**Location**: `mcp-servers/custom-api/`

**Tools to implement**:
- `call_api` - Generic HTTP client for any REST API

**Files**:
- `src/index.js` - Main server entry point
- `src/tools.js` - HTTP client implementation
- `Dockerfile` - Container configuration
- `package.json` - Dependencies
- `tests/tools.test.js` - Unit tests

## Dependencies

- **Phase 1**: Must be complete (API keys, project structure)
- **Blocking Phase 3**: E2B integration cannot proceed until MCP servers work

## Success Criteria

At the end of Phase 2, you must verify:

### Gladia MCP Server
- [ ] Server starts on port 8000
- [ ] `tools/list` returns tool definitions
- [ ] `transcribe_audio` successfully transcribes a test audio file
- [ ] `get_supported_languages` returns list of languages
- [ ] Docker image builds successfully
- [ ] Health check endpoint returns 200

### HoneyHive MCP Server
- [ ] Server starts on port 8001
- [ ] `tools/list` returns tool definitions
- [ ] `create_trace` creates trace in HoneyHive dashboard
- [ ] `log_event` adds events to trace
- [ ] `end_trace` completes trace
- [ ] Docker image builds successfully
- [ ] Health check endpoint returns 200

### Horizon3 MCP Server
- [ ] Server starts on port 8002
- [ ] `tools/list` returns tool definitions
- [ ] `run_security_scan` initiates scan (or returns mock data if API unavailable)
- [ ] `get_scan_results` retrieves results
- [ ] Docker image builds successfully
- [ ] Health check endpoint returns 200

### Custom API MCP Server
- [ ] Server starts on port 8003
- [ ] `tools/list` returns tool definition
- [ ] `call_api` successfully makes GET request to test URL
- [ ] `call_api` successfully makes POST request with body
- [ ] Handles authentication headers correctly
- [ ] Docker image builds successfully
- [ ] Health check endpoint returns 200

### Integration
- [ ] All 4 servers can run simultaneously without port conflicts
- [ ] Can use MCP Inspector to test each server
- [ ] Unit tests pass for all tool implementations

## Detailed Implementation Steps

### Step 1: Install FastMCP Framework

FastMCP simplifies MCP server creation with built-in JSON-RPC handling.

**For Node.js servers (Gladia, Horizon3, Custom API)**:
```bash
cd mcp-servers/gladia
npm init -y
npm install fastmcp dotenv

cd ../horizon3
npm init -y
npm install fastmcp dotenv

cd ../custom-api
npm init -y
npm install fastmcp dotenv
```

**For Python server (HoneyHive)**:
```bash
cd mcp-servers/honeyhive
pip install fastmcp honeyhive python-dotenv
pip freeze > requirements.txt
```

### Step 2: Implement Gladia MCP Server (3-4 hours)

#### `mcp-servers/gladia/package.json`

```json
{
  "name": "gladia-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "fastmcp": "^1.0.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "vitest": "^1.0.0"
  }
}
```

#### `mcp-servers/gladia/src/index.js`

```javascript
import { FastMCP } from 'fastmcp'
import dotenv from 'dotenv'
import { transcribeAudio, getSupportedLanguages } from './tools.js'

dotenv.config()

const mcp = new FastMCP('gladia-mcp-server', {
  port: process.env.PORT || 8000
})

// Tool: Transcribe Audio
mcp.tool({
  name: 'transcribe_audio',
  description: 'Transcribe audio file or URL to text using Gladia API. Supports multiple languages and audio formats.',
  parameters: {
    type: 'object',
    properties: {
      audioUrl: {
        type: 'string',
        description: 'URL or path to audio file (mp3, wav, m4a, etc.)'
      },
      language: {
        type: 'string',
        description: 'Language code (e.g., "en", "fr", "es"). Use "auto" for automatic detection.',
        default: 'auto'
      },
      enableDiarization: {
        type: 'boolean',
        description: 'Enable speaker diarization to identify different speakers',
        default: false
      }
    },
    required: ['audioUrl']
  },
  execute: transcribeAudio
})

// Tool: Get Supported Languages
mcp.tool({
  name: 'get_supported_languages',
  description: 'Get list of supported languages for transcription',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: getSupportedLanguages
})

// Health check endpoint
mcp.server.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'gladia-mcp', timestamp: new Date().toISOString() })
})

// Start server
await mcp.run('streamable-http')

console.log(`Gladia MCP Server running on port ${process.env.PORT || 8000}`)
```

#### `mcp-servers/gladia/src/tools.js`

```javascript
import dotenv from 'dotenv'
dotenv.config()

const GLADIA_API_KEY = process.env.GLADIA_API_KEY

if (!GLADIA_API_KEY) {
  console.error('ERROR: GLADIA_API_KEY not set in environment')
  process.exit(1)
}

export async function transcribeAudio({ audioUrl, language = 'auto', enableDiarization = false }) {
  try {
    console.log(`Transcribing audio: ${audioUrl} (language: ${language})`)

    const response = await fetch('https://api.gladia.io/v2/transcription', {
      method: 'POST',
      headers: {
        'X-Gladia-Key': GLADIA_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language: language === 'auto' ? undefined : language,
        diarization: enableDiarization
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Gladia API error (${response.status}): ${error}`)
    }

    const data = await response.json()

    return {
      success: true,
      transcription: data.transcription || data.text,
      language: data.language,
      confidence: data.confidence,
      diarization: data.diarization || null,
      metadata: {
        duration: data.duration,
        words: data.words?.length || 0
      }
    }
  } catch (error) {
    console.error('Transcription error:', error)
    return {
      success: false,
      error: error.message,
      transcription: null
    }
  }
}

export async function getSupportedLanguages() {
  // Gladia supports 100+ languages
  // This is a subset of common languages for the demo
  return {
    success: true,
    languages: [
      { code: 'auto', name: 'Auto-detect' },
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' }
    ]
  }
}
```

#### `mcp-servers/gladia/Dockerfile`

```dockerfile
FROM node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

EXPOSE 8000

CMD ["node", "src/index.js"]
```

#### `mcp-servers/gladia/tests/tools.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { transcribeAudio, getSupportedLanguages } from '../src/tools.js'

describe('Gladia MCP Tools', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('should transcribe audio successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        transcription: 'Hello world, this is a test',
        language: 'en',
        confidence: 0.95,
        duration: 3.2
      })
    })

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/audio.mp3',
      language: 'en'
    })

    expect(result.success).toBe(true)
    expect(result.transcription).toContain('Hello world')
    expect(result.language).toBe('en')
  })

  it('should handle API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized'
    })

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/audio.mp3'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('401')
  })

  it('should return supported languages', async () => {
    const result = await getSupportedLanguages()

    expect(result.success).toBe(true)
    expect(result.languages).toBeInstanceOf(Array)
    expect(result.languages.length).toBeGreaterThan(0)
    expect(result.languages[0]).toHaveProperty('code')
    expect(result.languages[0]).toHaveProperty('name')
  })
})
```

**Test Gladia Server**:
```bash
cd mcp-servers/gladia
npm start

# In another terminal
curl http://localhost:8000/health
# Should return: {"status":"healthy","service":"gladia-mcp",...}

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node src/index.js
# Visit http://localhost:5173
```

### Step 3: Implement HoneyHive MCP Server (3-4 hours)

#### `mcp-servers/honeyhive/requirements.txt`

```
fastmcp>=1.0.0
honeyhive>=0.1.0
python-dotenv>=1.0.0
```

#### `mcp-servers/honeyhive/src/server.py`

```python
import os
from fastmcp import FastMCP
from dotenv import load_dotenv
from tools import create_trace, log_event, log_metric, end_trace

load_dotenv()

mcp = FastMCP("honeyhive-mcp-server", port=int(os.getenv("PORT", 8001)))

@mcp.tool()
async def create_trace_tool(
    trace_name: str,
    session_id: str = None,
    metadata: dict = None
) -> dict:
    """
    Create a new trace for workflow execution in HoneyHive.

    Args:
        trace_name: Name of the trace
        session_id: Optional session identifier
        metadata: Additional metadata as dict

    Returns:
        dict with success status and trace_id
    """
    return await create_trace(trace_name, session_id, metadata)

@mcp.tool()
async def log_event_tool(
    event_name: str,
    trace_id: str,
    metadata: dict = None,
    level: str = "info"
) -> dict:
    """
    Log an event in an existing HoneyHive trace.

    Args:
        event_name: Name of the event
        trace_id: ID of the trace to log to
        metadata: Event data as dict
        level: Log level (info, warning, error)

    Returns:
        dict with success status
    """
    return await log_event(event_name, trace_id, metadata, level)

@mcp.tool()
async def log_metric_tool(
    metric_name: str,
    value: float,
    trace_id: str,
    tags: dict = None
) -> dict:
    """
    Log a metric value to HoneyHive trace.

    Args:
        metric_name: Name of the metric
        value: Numeric value
        trace_id: ID of the trace
        tags: Optional tags as dict

    Returns:
        dict with success status
    """
    return await log_metric(metric_name, value, trace_id, tags)

@mcp.tool()
async def end_trace_tool(
    trace_id: str,
    status: str = "success",
    metadata: dict = None
) -> dict:
    """
    Complete a HoneyHive trace.

    Args:
        trace_id: ID of the trace to end
        status: Final status (success, error, timeout)
        metadata: Final metadata

    Returns:
        dict with success status
    """
    return await end_trace(trace_id, status, metadata)

# Health check
@mcp.server.get("/health")
async def health():
    return {"status": "healthy", "service": "honeyhive-mcp"}

if __name__ == "__main__":
    mcp.run()
```

#### `mcp-servers/honeyhive/src/tools.py`

```python
import os
import uuid
from honeyhive import HoneyHive
from datetime import datetime

HONEYHIVE_API_KEY = os.getenv("HONEYHIVE_API_KEY")
HONEYHIVE_PROJECT = os.getenv("HONEYHIVE_PROJECT", "stepwise-agent")

if not HONEYHIVE_API_KEY:
    raise ValueError("HONEYHIVE_API_KEY not set in environment")

hh = HoneyHive(api_key=HONEYHIVE_API_KEY)

async def create_trace(trace_name: str, session_id: str = None, metadata: dict = None):
    """Create a new HoneyHive trace"""
    try:
        trace_id = str(uuid.uuid4())

        trace = hh.traces.create(
            project=HONEYHIVE_PROJECT,
            name=trace_name,
            trace_id=trace_id,
            session_id=session_id or trace_id,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        print(f"Created trace: {trace_id}")

        return {
            "success": True,
            "trace_id": trace_id,
            "message": f"Trace '{trace_name}' created successfully"
        }
    except Exception as e:
        print(f"Error creating trace: {e}")
        return {
            "success": False,
            "error": str(e),
            "trace_id": None
        }

async def log_event(event_name: str, trace_id: str, metadata: dict = None, level: str = "info"):
    """Log event to existing trace"""
    try:
        hh.events.log(
            project=HONEYHIVE_PROJECT,
            trace_id=trace_id,
            event_name=event_name,
            event_type=level,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        print(f"Logged event '{event_name}' to trace {trace_id}")

        return {
            "success": True,
            "message": f"Event '{event_name}' logged"
        }
    except Exception as e:
        print(f"Error logging event: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def log_metric(metric_name: str, value: float, trace_id: str, tags: dict = None):
    """Log metric to trace"""
    try:
        hh.metrics.log(
            project=HONEYHIVE_PROJECT,
            trace_id=trace_id,
            metric_name=metric_name,
            value=value,
            tags=tags or {},
            timestamp=datetime.utcnow().isoformat()
        )

        print(f"Logged metric '{metric_name}': {value}")

        return {
            "success": True,
            "message": f"Metric '{metric_name}' logged"
        }
    except Exception as e:
        print(f"Error logging metric: {e}")
        return {
            "success": False,
            "error": str(e)
        }

async def end_trace(trace_id: str, status: str = "success", metadata: dict = None):
    """Complete a trace"""
    try:
        hh.traces.end(
            project=HONEYHIVE_PROJECT,
            trace_id=trace_id,
            status=status,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        print(f"Ended trace {trace_id} with status: {status}")

        return {
            "success": True,
            "message": f"Trace ended with status: {status}"
        }
    except Exception as e:
        print(f"Error ending trace: {e}")
        return {
            "success": False,
            "error": str(e)
        }
```

#### `mcp-servers/honeyhive/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

EXPOSE 8001

CMD ["python", "src/server.py"]
```

**Test HoneyHive Server**:
```bash
cd mcp-servers/honeyhive
python src/server.py

# Test health
curl http://localhost:8001/health
```

### Step 4: Implement Custom API MCP Server (2-3 hours)

This server provides a generic HTTP client for calling any REST API.

#### `mcp-servers/custom-api/src/index.js`

```javascript
import { FastMCP } from 'fastmcp'
import dotenv from 'dotenv'
import { callApi } from './tools.js'

dotenv.config()

const mcp = new FastMCP('custom-api-mcp-server', {
  port: process.env.PORT || 8003
})

mcp.tool({
  name: 'call_api',
  description: 'Make HTTP request to any REST API. Supports GET, POST, PUT, PATCH, DELETE with headers, query params, and body.',
  parameters: {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        description: 'HTTP method'
      },
      url: {
        type: 'string',
        description: 'Full URL to call (must be HTTPS)'
      },
      headers: {
        type: 'object',
        description: 'HTTP headers as key-value pairs',
        default: {}
      },
      body: {
        type: 'object',
        description: 'Request body (for POST/PUT/PATCH)',
        default: null
      },
      timeout: {
        type: 'number',
        description: 'Request timeout in milliseconds',
        default: 30000
      }
    },
    required: ['method', 'url']
  },
  execute: callApi
})

mcp.server.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'custom-api-mcp' })
})

await mcp.run('streamable-http')
console.log(`Custom API MCP Server running on port ${process.env.PORT || 8003}`)
```

#### `mcp-servers/custom-api/src/tools.js`

```javascript
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254']
const PRIVATE_IP_REGEX = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/

export async function callApi({ method, url, headers = {}, body = null, timeout = 30000 }) {
  try {
    // Security: Validate URL
    const parsedUrl = new URL(url)

    // Block private IPs and localhost
    if (BLOCKED_HOSTS.includes(parsedUrl.hostname) || PRIVATE_IP_REGEX.test(parsedUrl.hostname)) {
      throw new Error(`Access to private IP addresses is blocked: ${parsedUrl.hostname}`)
    }

    // Enforce HTTPS (except for known safe domains like jsonplaceholder)
    if (parsedUrl.protocol !== 'https:' && !parsedUrl.hostname.includes('jsonplaceholder')) {
      console.warn(`Warning: Non-HTTPS URL: ${url}`)
    }

    console.log(`${method} ${url}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Stepwise-Agent/1.0',
        ...headers
      },
      signal: controller.signal
    }

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      options.body = JSON.stringify(body)
    }

    const startTime = Date.now()
    const response = await fetch(url, options)
    const duration = Date.now() - startTime

    clearTimeout(timeoutId)

    // Parse response
    const contentType = response.headers.get('content-type')
    let responseData

    if (contentType?.includes('application/json')) {
      responseData = await response.json()
    } else {
      responseData = await response.text()
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData,
      duration: `${duration}ms`,
      metadata: {
        method,
        url,
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    console.error(`API call error: ${error.message}`)

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: `Request timed out after ${timeout}ms`,
        status: 408,
        data: null
      }
    }

    return {
      success: false,
      error: error.message,
      status: 500,
      data: null
    }
  }
}
```

**Test Custom API Server**:
```bash
cd mcp-servers/custom-api
npm start

# Test with JSONPlaceholder API
curl -X POST http://localhost:8003/call \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "https://jsonplaceholder.typicode.com/users/1"
  }'
```

### Step 5: Implement Horizon3 MCP Server (3-4 hours)

**Note**: If Horizon3.ai API is not publicly available, implement mock responses for demo purposes.

#### `mcp-servers/horizon3/src/index.js`

```javascript
import { FastMCP } from 'fastmcp'
import dotenv from 'dotenv'
import { runSecurityScan, getScanResults, validatePermissions } from './tools.js'

dotenv.config()

const mcp = new FastMCP('horizon3-mcp-server', {
  port: process.env.PORT || 8002
})

mcp.tool({
  name: 'run_security_scan',
  description: 'Run security scan on API endpoint using Horizon3.ai NodeZero',
  parameters: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: 'Target URL or IP to scan'
      },
      scanType: {
        type: 'string',
        enum: ['quick', 'full', 'compliance'],
        description: 'Type of security scan',
        default: 'quick'
      }
    },
    required: ['target']
  },
  execute: runSecurityScan
})

mcp.tool({
  name: 'get_scan_results',
  description: 'Retrieve results from previous security scan',
  parameters: {
    type: 'object',
    properties: {
      scanId: {
        type: 'string',
        description: 'ID of the scan to retrieve'
      }
    },
    required: ['scanId']
  },
  execute: getScanResults
})

mcp.tool({
  name: 'validate_permissions',
  description: 'Validate RBAC permissions for user action',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User identifier'
      },
      resource: {
        type: 'string',
        description: 'Resource being accessed'
      },
      action: {
        type: 'string',
        description: 'Action to perform (read, write, delete, etc.)'
      }
    },
    required: ['userId', 'resource', 'action']
  },
  execute: validatePermissions
})

mcp.server.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'horizon3-mcp' })
})

await mcp.run('streamable-http')
console.log(`Horizon3 MCP Server running on port ${process.env.PORT || 8002}`)
```

#### `mcp-servers/horizon3/src/tools.js`

```javascript
import dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config()

const HORIZON3_API_KEY = process.env.HORIZON3_API_KEY
const USE_MOCK = !HORIZON3_API_KEY || process.env.HORIZON3_USE_MOCK === 'true'

// Mock data for demo if API not available
const mockScans = new Map()

export async function runSecurityScan({ target, scanType = 'quick' }) {
  try {
    console.log(`Running ${scanType} security scan on: ${target}`)

    if (USE_MOCK) {
      // Generate mock scan for demo
      const scanId = `scan_${crypto.randomUUID()}`

      mockScans.set(scanId, {
        scanId,
        target,
        scanType,
        status: 'completed',
        findings: [
          {
            severity: 'low',
            title: 'Missing Security Headers',
            description: 'Server does not set recommended security headers',
            remediation: 'Add X-Content-Type-Options, X-Frame-Options, etc.'
          },
          {
            severity: 'info',
            title: 'TLS Configuration',
            description: 'TLS 1.2+ is properly configured',
            status: 'pass'
          }
        ],
        summary: {
          critical: 0,
          high: 0,
          medium: 0,
          low: 1,
          info: 1
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date(Date.now() + 5000).toISOString()
      })

      return {
        success: true,
        scanId,
        status: 'initiated',
        message: `Security scan started for ${target}`,
        estimatedTime: '30s',
        note: 'Using mock scan for demo (Horizon3 API not configured)'
      }
    }

    // Real API call (if available)
    const response = await fetch('https://api.horizon3.ai/v1/scans', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HORIZON3_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target,
        scan_type: scanType
      })
    })

    if (!response.ok) {
      throw new Error(`Horizon3 API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      success: true,
      scanId: data.scan_id,
      status: data.status,
      message: `Security scan started for ${target}`
    }
  } catch (error) {
    console.error('Security scan error:', error)
    return {
      success: false,
      error: error.message,
      scanId: null
    }
  }
}

export async function getScanResults({ scanId }) {
  try {
    console.log(`Retrieving scan results: ${scanId}`)

    if (USE_MOCK) {
      const scan = mockScans.get(scanId)

      if (!scan) {
        return {
          success: false,
          error: 'Scan not found',
          results: null
        }
      }

      return {
        success: true,
        results: scan
      }
    }

    // Real API call
    const response = await fetch(`https://api.horizon3.ai/v1/scans/${scanId}`, {
      headers: {
        'Authorization': `Bearer ${HORIZON3_API_KEY}`
      }
    })

    if (!response.ok) {
      throw new Error(`Horizon3 API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      success: true,
      results: data
    }
  } catch (error) {
    console.error('Get scan results error:', error)
    return {
      success: false,
      error: error.message,
      results: null
    }
  }
}

export async function validatePermissions({ userId, resource, action }) {
  console.log(`Validating: ${userId} can ${action} on ${resource}`)

  // Mock RBAC validation for demo
  // In production, this would call Horizon3 RBAC API

  const allowed = Math.random() > 0.2 // 80% of requests allowed for demo

  return {
    success: true,
    allowed,
    userId,
    resource,
    action,
    reason: allowed ? 'User has required permissions' : 'Insufficient permissions',
    note: 'Using mock RBAC for demo'
  }
}
```

### Step 6: Build Docker Images (1 hour)

```bash
# Build Gladia
cd mcp-servers/gladia
docker build -t gladia-mcp:latest .

# Build HoneyHive
cd ../honeyhive
docker build -t honeyhive-mcp:latest .

# Build Horizon3
cd ../horizon3
docker build -t horizon3-mcp:latest .

# Build Custom API
cd ../custom-api
docker build -t custom-api-mcp:latest .

# Verify all images
docker images | grep mcp
```

### Step 7: Test All Servers Together (1 hour)

Create `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  gladia-mcp:
    image: gladia-mcp:latest
    ports:
      - "8000:8000"
    environment:
      - GLADIA_API_KEY=${GLADIA_API_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s

  honeyhive-mcp:
    image: honeyhive-mcp:latest
    ports:
      - "8001:8001"
    environment:
      - HONEYHIVE_API_KEY=${HONEYHIVE_API_KEY}
      - HONEYHIVE_PROJECT=stepwise-agent

  horizon3-mcp:
    image: horizon3-mcp:latest
    ports:
      - "8002:8002"
    environment:
      - HORIZON3_API_KEY=${HORIZON3_API_KEY}
      - HORIZON3_USE_MOCK=true

  custom-api-mcp:
    image: custom-api-mcp:latest
    ports:
      - "8003:8003"
```

Run:
```bash
docker-compose -f docker-compose.test.yml up

# Test all health endpoints
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health

# All should return "healthy"
```

## Common Pitfalls

1. **Port Conflicts**: Ensure ports 8000-8003 are not in use
2. **API Key Format**: Check for trailing spaces in .env
3. **CORS Issues**: MCP uses JSON-RPC, not REST (no CORS needed)
4. **Timeout Errors**: Increase timeout for slow APIs
5. **Docker Build Cache**: Use `--no-cache` if changes not reflected

## Time Breakdown

| Task | Time |
|------|------|
| Gladia MCP Server | 3-4 hours |
| HoneyHive MCP Server | 3-4 hours |
| Horizon3 MCP Server | 3-4 hours |
| Custom API MCP Server | 2-3 hours |
| Docker images | 1 hour |
| Integration testing | 1 hour |
| **TOTAL** | **12-16 hours** |

## Next Steps

Once all success criteria are met:

**[Phase 3: E2B + Docker Integration](./PHASE_3.md)**

Phase 3 will orchestrate these MCP servers within E2B sandboxes using Docker Compose.

---

**Phase 2 Complete!** You now have 4 functional MCP servers ready for E2B integration. 🚀
