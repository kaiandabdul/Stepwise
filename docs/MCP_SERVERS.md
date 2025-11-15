# MCP_SERVERS.md

## Building & Integrating MCP Servers

### Table of Contents
1. [MCP Server Fundamentals](#mcp-server-fundamentals)
2. [MCP Server Implementation Patterns](#mcp-server-implementation-patterns)
3. [Gladia MCP Server Implementation](#gladia-mcp-server-implementation)
4. [HoneyHive MCP Server Implementation](#honeyhive-mcp-server-implementation)
5. [Horizon3.ai NodeZero MCP Server Implementation](#horizon3ai-nodezero-mcp-server-implementation)
6. [Custom REST API MCP Server](#custom-rest-api-mcp-server)
7. [Dockerizing MCP Servers](#dockerizing-mcp-servers)
8. [MCP Server Configuration](#mcp-server-configuration)
9. [Testing MCP Servers](#testing-mcp-servers)
10. [MCP Server Catalog Registration](#mcp-server-catalog-registration)

---

## 1. MCP Server Fundamentals

### What is an MCP Server?

An **MCP (Model Context Protocol) Server** is a standardized way to expose tools, resources, and prompts to AI applications. It acts as a bridge between LLMs and external systems.

**Key Concepts**:
- **Tools**: Functions the AI can call (e.g., `transcribe_audio`, `log_event`)
- **Resources**: Data sources the AI can access (e.g., documents, databases)
- **Prompts**: Pre-defined prompt templates
- **JSON-RPC 2.0**: Communication protocol
- **Transport**: STDIO (local) or HTTP/SSE (remote)

### MCP Protocol Specification

**Official Spec**: [https://modelcontextprotocol.io/specification](https://modelcontextprotocol.io/specification)

**Core Methods**:
```
tools/list        - List available tools
tools/call        - Execute a tool
resources/list    - List available resources
resources/read    - Read a resource
prompts/list      - List available prompts
prompts/get       - Get a prompt template
```

### Tool Definition Schema

```json
{
  "name": "tool_name",
  "description": "What this tool does",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Parameter description"
      },
      "param2": {
        "type": "number",
        "description": "Another parameter",
        "default": 0
      }
    },
    "required": ["param1"]
  }
}
```

---

## 2. MCP Server Implementation Patterns

### 2.1 Node.js Implementation (Using FastMCP)

**Installation**:
```bash
npm install fastmcp
```

**Basic Server Structure**:
```javascript
// server.js
import { FastMCP } from 'fastmcp'

const mcp = new FastMCP('my-mcp-server', {
  port: 8000  // Optional, for HTTP transport
})

// Register a tool
mcp.tool({
  name: 'my_tool',
  description: 'Description of what this tool does',
  parameters: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input parameter'
      }
    },
    required: ['input']
  },
  execute: async (params) => {
    // Tool implementation
    const result = await doSomething(params.input)
    return { result }
  }
})

// Start server
mcp.run('streamable-http')  // or 'stdio' for STDIO transport
```

### 2.2 Python Implementation (Using FastMCP)

**Installation**:
```bash
pip install fastmcp
```

**Basic Server Structure**:
```python
# server.py
from fastmcp import FastMCP

mcp = FastMCP("my-mcp-server", port=8000)

@mcp.tool()
def my_tool(input: str) -> dict:
    """Description of what this tool does"""
    result = do_something(input)
    return {"result": result}

if __name__ == "__main__":
    mcp.run("streamable-http")  # or "stdio"
```

### 2.3 Tool Execution Pattern

**Node.js**:
```javascript
mcp.tool({
  name: 'api_call',
  description: 'Make an HTTP API call',
  parameters: {
    type: 'object',
    properties: {
      method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
      url: { type: 'string' },
      headers: { type: 'object' },
      body: { type: 'object' }
    },
    required: ['method', 'url']
  },
  execute: async ({ method, url, headers = {}, body = null }) => {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      })

      const data = await response.json()

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: data
      }

    } catch (error) {
      throw new Error(`API call failed: ${error.message}`)
    }
  }
})
```

### 2.4 Error Handling Pattern

```javascript
mcp.tool({
  name: 'risky_operation',
  description: 'An operation that might fail',
  parameters: { /* ... */ },
  execute: async (params) => {
    try {
      const result = await performOperation(params)
      return { success: true, result }

    } catch (error) {
      // Log error
      console.error('Operation failed:', error)

      // Return structured error
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code || 'UNKNOWN_ERROR',
          details: error.stack
        }
      }
    }
  }
})
```

---

## 3. Gladia MCP Server Implementation

### 3.1 Gladia API Overview

**Purpose**: Speech-to-text transcription

**API Endpoint**: `https://api.gladia.io/v2/transcription`

**Authentication**: API key in `X-Gladia-Key` header

**Key Features**:
- Supports multiple audio formats (MP3, WAV, OGG, etc.)
- Multi-language support
- Async and sync transcription
- Speaker diarization (who said what)

### 3.2 Node.js Implementation

**Directory Structure**:
```
mcp-servers/gladia/
├── package.json
├── server.js
├── Dockerfile
└── README.md
```

**package.json**:
```json
{
  "name": "gladia-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "fastmcp": "^0.1.0",
    "node-fetch": "^3.3.0",
    "dotenv": "^16.3.1"
  },
  "scripts": {
    "start": "node server.js"
  }
}
```

**server.js**:
```javascript
import { FastMCP } from 'fastmcp'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const GLADIA_API_KEY = process.env.GLADIA_API_KEY

if (!GLADIA_API_KEY) {
  throw new Error('GLADIA_API_KEY environment variable is required')
}

const mcp = new FastMCP('gladia-mcp-server', { port: 8000 })

// Tool: Transcribe Audio
mcp.tool({
  name: 'transcribe_audio',
  description: 'Transcribe audio file to text using Gladia API',
  parameters: {
    type: 'object',
    properties: {
      audioUrl: {
        type: 'string',
        description: 'URL or path to audio file'
      },
      language: {
        type: 'string',
        description: 'Language code (e.g., "en", "es", "fr")',
        default: 'en'
      },
      enableDiarization: {
        type: 'boolean',
        description: 'Enable speaker diarization',
        default: false
      }
    },
    required: ['audioUrl']
  },
  execute: async ({ audioUrl, language = 'en', enableDiarization = false }) => {
    try {
      console.log(`Transcribing audio: ${audioUrl}`)

      const response = await fetch('https://api.gladia.io/v2/transcription', {
        method: 'POST',
        headers: {
          'X-Gladia-Key': GLADIA_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          language,
          diarization: enableDiarization
        })
      })

      if (!response.ok) {
        throw new Error(`Gladia API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      return {
        success: true,
        transcription: data.transcription || data.text,
        language: data.language,
        duration: data.duration,
        speakers: data.speakers || []
      }

    } catch (error) {
      console.error('Transcription failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
})

// Tool: Get Supported Languages
mcp.tool({
  name: 'get_supported_languages',
  description: 'Get list of supported languages for transcription',
  parameters: {
    type: 'object',
    properties: {}
  },
  execute: async () => {
    return {
      languages: [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'zh', name: 'Chinese' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'ar', name: 'Arabic' }
      ]
    }
  }
})

// Prompt: System prompt for audio processing
mcp.prompt({
  name: 'audio_transcription_prompt',
  description: 'Prompt for processing audio transcription tasks',
  template: `You are an AI assistant helping with audio transcription and analysis.

User request: {{user_input}}

Available tools:
- transcribe_audio: Transcribe audio files to text
- get_supported_languages: Get list of supported languages

Please help the user with their audio transcription needs.`
})

console.log('Starting Gladia MCP Server...')
mcp.run('streamable-http')
```

### 3.3 Python Implementation

**server.py**:
```python
from fastmcp import FastMCP
import os
import requests
from dotenv import load_dotenv

load_dotenv()

GLADIA_API_KEY = os.getenv('GLADIA_API_KEY')

if not GLADIA_API_KEY:
    raise ValueError('GLADIA_API_KEY environment variable is required')

mcp = FastMCP("gladia-mcp-server", port=8000)

@mcp.tool()
async def transcribe_audio(
    audio_url: str,
    language: str = "en",
    enable_diarization: bool = False
) -> dict:
    """Transcribe audio file to text using Gladia API

    Args:
        audio_url: URL or path to audio file
        language: Language code (e.g., "en", "es", "fr")
        enable_diarization: Enable speaker diarization

    Returns:
        Transcription result with text and metadata
    """
    try:
        print(f'Transcribing audio: {audio_url}')

        response = requests.post(
            'https://api.gladia.io/v2/transcription',
            headers={
                'X-Gladia-Key': GLADIA_API_KEY,
                'Content-Type': 'application/json'
            },
            json={
                'audio_url': audio_url,
                'language': language,
                'diarization': enable_diarization
            }
        )

        response.raise_for_status()
        data = response.json()

        return {
            'success': True,
            'transcription': data.get('transcription') or data.get('text'),
            'language': data.get('language'),
            'duration': data.get('duration'),
            'speakers': data.get('speakers', [])
        }

    except Exception as error:
        print(f'Transcription failed: {error}')
        return {
            'success': False,
            'error': str(error)
        }

@mcp.tool()
def get_supported_languages() -> dict:
    """Get list of supported languages for transcription"""
    return {
        'languages': [
            {'code': 'en', 'name': 'English'},
            {'code': 'es', 'name': 'Spanish'},
            {'code': 'fr', 'name': 'French'},
            {'code': 'de', 'name': 'German'},
            {'code': 'it', 'name': 'Italian'},
            {'code': 'pt', 'name': 'Portuguese'},
            {'code': 'zh', 'name': 'Chinese'},
            {'code': 'ja', 'name': 'Japanese'},
            {'code': 'ko', 'name': 'Korean'},
            {'code': 'ar', 'name': 'Arabic'}
        ]
    }

@mcp.prompt()
def audio_transcription_prompt(user_input: str) -> str:
    """Prompt for processing audio transcription tasks"""
    return f"""You are an AI assistant helping with audio transcription and analysis.

User request: {user_input}

Available tools:
- transcribe_audio: Transcribe audio files to text
- get_supported_languages: Get list of supported languages

Please help the user with their audio transcription needs."""

if __name__ == "__main__":
    print('Starting Gladia MCP Server...')
    mcp.run("streamable-http")
```

### 3.4 Testing Gladia MCP Server

**Manual Test**:
```bash
# Start server
node server.js

# Test with curl
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "transcribe_audio",
      "arguments": {
        "audioUrl": "https://example.com/sample.mp3",
        "language": "en"
      }
    }
  }'
```

---

## 4. HoneyHive MCP Server Implementation

### 4.1 HoneyHive SDK Overview

**Purpose**: LLM observability, logging, and tracing

**Key Features**:
- Trace workflow executions
- Log events and metrics
- Monitor LLM performance
- Debug agent behavior
- Cost tracking

**Installation**:
```bash
# Python
pip install honeyhive

# Node.js (if SDK exists)
npm install honeyhive-sdk
```

### 4.2 Python Implementation

**Directory Structure**:
```
mcp-servers/honeyhive/
├── requirements.txt
├── server.py
├── Dockerfile
└── README.md
```

**requirements.txt**:
```
fastmcp>=0.1.0
honeyhive>=0.1.0
python-dotenv>=1.0.0
```

**server.py**:
```python
from fastmcp import FastMCP
from honeyhive import HoneyHiveSDK
import os
from dotenv import load_dotenv
from datetime import datetime
import uuid

load_dotenv()

HONEYHIVE_API_KEY = os.getenv('HONEYHIVE_API_KEY')
HONEYHIVE_PROJECT = os.getenv('HONEYHIVE_PROJECT', 'stepwise-agent')

if not HONEYHIVE_API_KEY:
    raise ValueError('HONEYHIVE_API_KEY environment variable is required')

# Initialize HoneyHive SDK
hh = HoneyHiveSDK(api_key=HONEYHIVE_API_KEY)

mcp = FastMCP("honeyhive-mcp-server", port=8001)

@mcp.tool()
async def create_trace(
    trace_name: str,
    session_id: str = None,
    metadata: dict = None
) -> dict:
    """Create a new trace for workflow execution

    Args:
        trace_name: Name of the trace
        session_id: Optional session ID
        metadata: Additional metadata

    Returns:
        Trace ID and details
    """
    try:
        trace_id = str(uuid.uuid4())

        trace = hh.traces.create(
            project=HONEYHIVE_PROJECT,
            name=trace_name,
            trace_id=trace_id,
            session_id=session_id,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        return {
            'success': True,
            'trace_id': trace_id,
            'project': HONEYHIVE_PROJECT
        }

    except Exception as error:
        print(f'Create trace failed: {error}')
        return {
            'success': False,
            'error': str(error)
        }

@mcp.tool()
async def log_event(
    event_name: str,
    trace_id: str = None,
    metadata: dict = None,
    level: str = "info"
) -> dict:
    """Log an event during workflow execution

    Args:
        event_name: Name of the event
        trace_id: Optional trace ID to associate with
        metadata: Event metadata
        level: Log level (info, warning, error)

    Returns:
        Event ID and confirmation
    """
    try:
        event_id = str(uuid.uuid4())

        event = hh.events.log(
            project=HONEYHIVE_PROJECT,
            event_name=event_name,
            event_id=event_id,
            trace_id=trace_id,
            level=level,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        return {
            'success': True,
            'event_id': event_id,
            'event_name': event_name
        }

    except Exception as error:
        print(f'Log event failed: {error}')
        return {
            'success': False,
            'error': str(error)
        }

@mcp.tool()
async def log_metric(
    metric_name: str,
    value: float,
    tags: dict = None,
    trace_id: str = None
) -> dict:
    """Log a metric (e.g., latency, cost, token count)

    Args:
        metric_name: Name of the metric
        value: Metric value
        tags: Additional tags for filtering
        trace_id: Optional trace ID

    Returns:
        Confirmation
    """
    try:
        hh.metrics.log(
            project=HONEYHIVE_PROJECT,
            metric_name=metric_name,
            value=value,
            tags=tags or {},
            trace_id=trace_id,
            timestamp=datetime.utcnow().isoformat()
        )

        return {
            'success': True,
            'metric_name': metric_name,
            'value': value
        }

    except Exception as error:
        print(f'Log metric failed: {error}')
        return {
            'success': False,
            'error': str(error)
        }

@mcp.tool()
async def end_trace(
    trace_id: str,
    status: str = "completed",
    metadata: dict = None
) -> dict:
    """End a trace

    Args:
        trace_id: Trace ID to end
        status: Final status (completed, failed, cancelled)
        metadata: Final metadata

    Returns:
        Confirmation
    """
    try:
        hh.traces.end(
            project=HONEYHIVE_PROJECT,
            trace_id=trace_id,
            status=status,
            metadata=metadata or {},
            timestamp=datetime.utcnow().isoformat()
        )

        return {
            'success': True,
            'trace_id': trace_id,
            'status': status
        }

    except Exception as error:
        print(f'End trace failed: {error}')
        return {
            'success': False,
            'error': str(error)
        }

@mcp.tool()
async def get_traces(
    session_id: str = None,
    limit: int = 10
) -> dict:
    """Retrieve traces for analysis

    Args:
        session_id: Filter by session ID
        limit: Maximum number of traces to return

    Returns:
        List of traces
    """
    try:
        traces = hh.traces.list(
            project=HONEYHIVE_PROJECT,
            session_id=session_id,
            limit=limit
        )

        return {
            'success': True,
            'traces': traces,
            'count': len(traces)
        }

    except Exception as error:
        print(f'Get traces failed: {error}')
        return {
            'success': False,
            'error': str(error)
        }

@mcp.prompt()
def observability_prompt(user_input: str) -> str:
    """Prompt for observability and logging tasks"""
    return f"""You are an AI assistant helping with workflow observability and logging.

User request: {user_input}

Available tools:
- create_trace: Start tracking a workflow
- log_event: Log individual events
- log_metric: Log performance metrics
- end_trace: Complete a trace
- get_traces: Retrieve trace history

Please help the user monitor and debug their workflows."""

if __name__ == "__main__":
    print('Starting HoneyHive MCP Server...')
    mcp.run("streamable-http")
```

### 4.3 Usage Example with Agent

```python
# In agent code
async def execute_workflow_with_tracing(workflow, session_id):
    # Create trace
    trace = await honeyhive_mcp.call_tool('create_trace', {
        'trace_name': f'workflow_{workflow.name}',
        'session_id': session_id,
        'metadata': {'user_id': workflow.user_id}
    })

    trace_id = trace['trace_id']

    try:
        for step in workflow.steps:
            # Log event for each step
            await honeyhive_mcp.call_tool('log_event', {
                'event_name': f'step_start_{step.name}',
                'trace_id': trace_id,
                'metadata': {'step': step.name}
            })

            # Execute step
            start_time = time.time()
            result = await execute_step(step)
            duration = time.time() - start_time

            # Log metric
            await honeyhive_mcp.call_tool('log_metric', {
                'metric_name': 'step_duration',
                'value': duration,
                'tags': {'step': step.name},
                'trace_id': trace_id
            })

            # Log completion
            await honeyhive_mcp.call_tool('log_event', {
                'event_name': f'step_complete_{step.name}',
                'trace_id': trace_id,
                'metadata': {'result': result, 'duration': duration}
            })

        # End trace successfully
        await honeyhive_mcp.call_tool('end_trace', {
            'trace_id': trace_id,
            'status': 'completed'
        })

    except Exception as error:
        # Log error
        await honeyhive_mcp.call_tool('log_event', {
            'event_name': 'workflow_error',
            'trace_id': trace_id,
            'level': 'error',
            'metadata': {'error': str(error)}
        })

        # End trace with failure
        await honeyhive_mcp.call_tool('end_trace', {
            'trace_id': trace_id,
            'status': 'failed',
            'metadata': {'error': str(error)}
        })

        raise
```

---

## 5. Horizon3.ai NodeZero MCP Server Implementation

### 5.1 Horizon3.ai NodeZero Overview

**Purpose**: Security scanning and RBAC validation

**Key Features**:
- API security scanning
- Vulnerability assessment
- RBAC/permission validation
- Compliance checking

**Note**: Since Horizon3.ai API documentation may require access, this implementation shows a generic pattern. Adjust based on actual API docs.

### 5.2 Node.js Implementation

**Directory Structure**:
```
mcp-servers/horizon3/
├── package.json
├── server.js
├── Dockerfile
└── README.md
```

**server.js**:
```javascript
import { FastMCP } from 'fastmcp'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const HORIZON3_API_KEY = process.env.HORIZON3_API_KEY
const HORIZON3_API_URL = process.env.HORIZON3_API_URL || 'https://api.horizon3.ai'

if (!HORIZON3_API_KEY) {
  throw new Error('HORIZON3_API_KEY environment variable is required')
}

const mcp = new FastMCP('horizon3-mcp-server', { port: 8002 })

// Tool: Run Security Scan
mcp.tool({
  name: 'run_security_scan',
  description: 'Run security scan on API endpoint',
  parameters: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: 'Target URL or API endpoint to scan'
      },
      scanType: {
        type: 'string',
        enum: ['quick', 'full', 'vulnerability'],
        description: 'Type of security scan to perform',
        default: 'quick'
      },
      options: {
        type: 'object',
        description: 'Additional scan options',
        properties: {
          checkAuth: { type: 'boolean', default: true },
          checkRateLimit: { type: 'boolean', default: true },
          checkInjection: { type: 'boolean', default: true }
        }
      }
    },
    required: ['target']
  },
  execute: async ({ target, scanType = 'quick', options = {} }) => {
    try {
      console.log(`Starting ${scanType} security scan on ${target}`)

      const response = await fetch(`${HORIZON3_API_URL}/v1/scans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HORIZON3_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target,
          scan_type: scanType,
          options
        })
      })

      if (!response.ok) {
        throw new Error(`Horizon3 API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        scan_id: data.scan_id,
        status: data.status,
        estimated_duration: data.estimated_duration_seconds
      }

    } catch (error) {
      console.error('Security scan failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
})

// Tool: Get Scan Results
mcp.tool({
  name: 'get_scan_results',
  description: 'Get results from a completed security scan',
  parameters: {
    type: 'object',
    properties: {
      scanId: {
        type: 'string',
        description: 'Scan ID from run_security_scan'
      }
    },
    required: ['scanId']
  },
  execute: async ({ scanId }) => {
    try {
      console.log(`Fetching results for scan ${scanId}`)

      const response = await fetch(`${HORIZON3_API_URL}/v1/scans/${scanId}`, {
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
        status: data.status,
        vulnerabilities: data.vulnerabilities || [],
        recommendations: data.recommendations || [],
        risk_score: data.risk_score,
        summary: data.summary
      }

    } catch (error) {
      console.error('Get scan results failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
})

// Tool: Validate Permissions
mcp.tool({
  name: 'validate_permissions',
  description: 'Validate RBAC permissions for a user/resource/action',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'User ID to check'
      },
      resource: {
        type: 'string',
        description: 'Resource to access'
      },
      action: {
        type: 'string',
        description: 'Action to perform (read, write, delete, etc.)'
      }
    },
    required: ['userId', 'resource', 'action']
  },
  execute: async ({ userId, resource, action }) => {
    try {
      console.log(`Validating ${action} permission for ${userId} on ${resource}`)

      const response = await fetch(`${HORIZON3_API_URL}/v1/rbac/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HORIZON3_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          resource,
          action
        })
      })

      if (!response.ok) {
        throw new Error(`Horizon3 API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        allowed: data.allowed,
        reason: data.reason,
        required_roles: data.required_roles
      }

    } catch (error) {
      console.error('Permission validation failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
})

// Tool: Check Compliance
mcp.tool({
  name: 'check_compliance',
  description: 'Check API compliance against security standards',
  parameters: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description: 'Target URL or API endpoint'
      },
      standards: {
        type: 'array',
        items: { type: 'string' },
        description: 'Security standards to check (e.g., OWASP, PCI-DSS)',
        default: ['OWASP']
      }
    },
    required: ['target']
  },
  execute: async ({ target, standards = ['OWASP'] }) => {
    try {
      console.log(`Checking compliance for ${target} against ${standards.join(', ')}`)

      const response = await fetch(`${HORIZON3_API_URL}/v1/compliance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HORIZON3_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          target,
          standards
        })
      })

      if (!response.ok) {
        throw new Error(`Horizon3 API error: ${response.status}`)
      }

      const data = await response.json()

      return {
        success: true,
        compliant: data.compliant,
        violations: data.violations || [],
        score: data.compliance_score
      }

    } catch (error) {
      console.error('Compliance check failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
})

console.log('Starting Horizon3.ai MCP Server...')
mcp.run('streamable-http')
```

### 5.3 Usage Example

```javascript
// In agent code
async function debugAPIWithSecurityScan(apiUrl) {
  // 1. Test API
  const apiResult = await customApiMcp.callTool('call_api', {
    method: 'GET',
    url: apiUrl
  })

  // 2. Run security scan
  const scanStart = await horizon3Mcp.callTool('run_security_scan', {
    target: apiUrl,
    scanType: 'full'
  })

  // 3. Wait for scan to complete (poll)
  let scanResult
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 5000))

    scanResult = await horizon3Mcp.callTool('get_scan_results', {
      scanId: scanStart.scan_id
    })

    if (scanResult.status === 'completed') break
  }

  // 4. Report findings
  return {
    api_response: apiResult,
    security_scan: scanResult,
    recommendation: scanResult.vulnerabilities.length > 0
      ? `Found ${scanResult.vulnerabilities.length} vulnerabilities. Review security report.`
      : 'No vulnerabilities found. API is secure.'
  }
}
```

---

## 6. Custom REST API MCP Server

### 6.1 Purpose

A generic HTTP client for debugging arbitrary REST APIs without writing custom code for each API.

### 6.2 Node.js Implementation

**server.js**:
```javascript
import { FastMCP } from 'fastmcp'
import fetch from 'node-fetch'

const mcp = new FastMCP('custom-api-mcp-server', { port: 8003 })

// Tool: Call API
mcp.tool({
  name: 'call_api',
  description: 'Make HTTP request to any REST API',
  parameters: {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
        description: 'HTTP method'
      },
      url: {
        type: 'string',
        description: 'Full URL including protocol (https://...)'
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
  execute: async ({ method, url, headers = {}, body = null, timeout = 30000 }) => {
    try {
      console.log(`${method} ${url}`)

      // Validate URL
      try {
        new URL(url)
      } catch {
        throw new Error('Invalid URL format')
      }

      // Prepare request options
      const options = {
        method,
        headers: {
          'User-Agent': 'Stepwise-API-Debugger/1.0',
          ...headers
        },
        signal: AbortSignal.timeout(timeout)
      }

      // Add body for methods that support it
      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = JSON.stringify(body)
        options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json'
      }

      // Make request
      const startTime = Date.now()
      const response = await fetch(url, options)
      const duration = Date.now() - startTime

      // Parse response
      const contentType = response.headers.get('content-type') || ''
      let responseBody

      if (contentType.includes('application/json')) {
        responseBody = await response.json()
      } else if (contentType.includes('text/')) {
        responseBody = await response.text()
      } else {
        responseBody = await response.text()
      }

      // Return structured result
      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        duration_ms: duration,
        size_bytes: response.headers.get('content-length')
      }

    } catch (error) {
      console.error('API call failed:', error)

      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          timeout_ms: timeout
        }
      }

      return {
        success: false,
        error: error.message
      }
    }
  }
})

// Tool: Parse OpenAPI Spec (stretch goal)
mcp.tool({
  name: 'parse_openapi_spec',
  description: 'Parse OpenAPI/Swagger specification',
  parameters: {
    type: 'object',
    properties: {
      specUrl: {
        type: 'string',
        description: 'URL to OpenAPI spec (JSON or YAML)'
      }
    },
    required: ['specUrl']
  },
  execute: async ({ specUrl }) => {
    try {
      const response = await fetch(specUrl)
      const spec = await response.json()

      // Extract endpoints
      const endpoints = []
      for (const [path, methods] of Object.entries(spec.paths || {})) {
        for (const [method, details] of Object.entries(methods)) {
          if (typeof details === 'object') {
            endpoints.push({
              path,
              method: method.toUpperCase(),
              summary: details.summary || '',
              description: details.description || '',
              parameters: details.parameters || []
            })
          }
        }
      }

      return {
        success: true,
        info: spec.info || {},
        servers: spec.servers || [],
        endpoints,
        total_endpoints: endpoints.length
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }
})

console.log('Starting Custom API MCP Server...')
mcp.run('streamable-http')
```

---

## 7. Dockerizing MCP Servers

### 7.1 Dockerfile Template (Node.js)

**Dockerfile**:
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy server code
COPY . .

# Expose port (if using HTTP transport)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "const http = require('http'); http.get('http://localhost:8000/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1));"

# Run server
CMD ["node", "server.js"]
```

### 7.2 Dockerfile Template (Python)

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy server code
COPY . .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run server
CMD ["python", "server.py"]
```

### 7.3 Building Images

```bash
# Build Gladia MCP Server
cd mcp-servers/gladia
docker build -t gladia-mcp-server:latest .

# Build HoneyHive MCP Server
cd ../honeyhive
docker build -t honeyhive-mcp-server:latest .

# Build Horizon3 MCP Server
cd ../horizon3
docker build -t horizon3-mcp-server:latest .

# Build Custom API MCP Server
cd ../custom-api
docker build -t custom-api-mcp-server:latest .
```

### 7.4 Multi-Stage Dockerfile (Optimization)

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build  # If TypeScript or bundling needed

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

EXPOSE 8000

CMD ["node", "dist/server.js"]
```

### 7.5 .dockerignore

```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
Dockerfile
.dockerignore
*.md
__pycache__
*.pyc
.pytest_cache
```

---

## 8. MCP Server Configuration

### 8.1 Environment Variables

Create `.env.example` for each server:

```bash
# Gladia MCP Server
GLADIA_API_KEY=your_api_key_here
PORT=8000
LOG_LEVEL=info

# HoneyHive MCP Server
HONEYHIVE_API_KEY=your_api_key_here
HONEYHIVE_PROJECT=stepwise-agent
PORT=8001

# Horizon3 MCP Server
HORIZON3_API_KEY=your_api_key_here
HORIZON3_API_URL=https://api.horizon3.ai
PORT=8002
```

### 8.2 Configuration Files

**config.json** (optional):
```json
{
  "server": {
    "name": "gladia-mcp-server",
    "version": "1.0.0",
    "port": 8000,
    "transport": "streamable-http"
  },
  "logging": {
    "level": "info",
    "format": "json"
  },
  "api": {
    "timeout_ms": 30000,
    "retries": 3,
    "retry_delay_ms": 1000
  }
}
```

---

## 9. Testing MCP Servers

### 9.1 Unit Tests (Node.js/Jest)

**\_\_tests\_\_/gladia.test.js**:
```javascript
import { FastMCP } from 'fastmcp'
import fetch from 'node-fetch'

// Mock fetch
jest.mock('node-fetch')

describe('Gladia MCP Server', () => {
  test('transcribe_audio tool should work', async () => {
    // Mock successful API response
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        transcription: 'Test transcription',
        language: 'en',
        duration: 10.5
      })
    })

    const mcp = new FastMCP('test-gladia')

    // Register tool (copy from server.js)
    // ...

    const result = await mcp.callTool('transcribe_audio', {
      audioUrl: 'https://example.com/test.mp3'
    })

    expect(result.success).toBe(true)
    expect(result.transcription).toBe('Test transcription')
  })
})
```

### 9.2 Integration Tests

**test-integration.js**:
```javascript
import fetch from 'node-fetch'

async function testMCPServer(name, url, tool, params) {
  console.log(`Testing ${name}...`)

  const response = await fetch(`${url}/mcp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: tool,
        arguments: params
      }
    })
  })

  const result = await response.json()
  console.log(`${name} result:`, result)

  return result
}

// Run tests
async function runTests() {
  // Test Gladia
  await testMCPServer(
    'Gladia',
    'http://localhost:8000',
    'transcribe_audio',
    { audioUrl: 'https://example.com/test.mp3' }
  )

  // Test HoneyHive
  await testMCPServer(
    'HoneyHive',
    'http://localhost:8001',
    'create_trace',
    { trace_name: 'test_trace', session_id: 'test-123' }
  )

  // Test Horizon3
  await testMCPServer(
    'Horizon3',
    'http://localhost:8002',
    'run_security_scan',
    { target: 'https://api.example.com', scanType: 'quick' }
  )

  console.log('All tests completed!')
}

runTests()
```

---

## 10. MCP Server Catalog Registration

### 10.1 Publishing to MCP Catalog (Stretch Goal)

**Steps**:
1. Create GitHub repository for MCP server
2. Add comprehensive README with usage examples
3. Tag release version
4. Submit to official MCP catalog

**README Template**:
```markdown
# Gladia MCP Server

Speech-to-text transcription for Model Context Protocol.

## Installation

### Docker
\```bash
docker pull gladia-mcp-server:latest
\```

### npm
\```bash
npm install -g gladia-mcp-server
\```

## Configuration

Set environment variable:
\```bash
export GLADIA_API_KEY=your_api_key
\```

## Usage

### With Claude Desktop
\```json
{
  "mcpServers": {
    "gladia": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "gladia-mcp-server:latest"]
    }
  }
}
\```

## Tools

- `transcribe_audio(audioUrl, language)` - Transcribe audio file
- `get_supported_languages()` - Get supported languages

## License

MIT
```

---

## Conclusion

This guide provides complete implementations for:

- ✅ **Gladia MCP Server** (speech-to-text)
- ✅ **HoneyHive MCP Server** (observability/logging)
- ✅ **Horizon3.ai MCP Server** (security scanning)
- ✅ **Custom REST API MCP Server** (generic HTTP client)
- ✅ **Docker packaging** for all servers
- ✅ **Testing strategies**

**Next Steps**:
1. Implement each MCP server following the patterns above
2. Build Docker images
3. Test individually before integration
4. Proceed to WORKFLOW_ORCHESTRATION.md for agent logic

**Key Takeaways**:
- Use FastMCP for rapid MCP server development
- Implement proper error handling
- Dockerize for portability
- Test thoroughly before integration
- Document tool schemas clearly
