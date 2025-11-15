# HoneyHive MCP Server

**Version:** 1.0.0
**Port:** 8001
**Protocol:** JSON-RPC 2.0 via FastMCP
**Language:** Python 3.11+

## Overview

The HoneyHive MCP Server provides AI observability and tracing capabilities for the Stepwise Live API Debugger Agent. It integrates with [HoneyHive](https://www.honeyhive.ai/), a production-grade observability platform for LLM applications, enabling:

- **Workflow Tracing**: Create and manage execution traces for debugging workflows
- **Event Logging**: Log significant events during API debugging sessions
- **Metric Tracking**: Record performance metrics (response times, token counts, etc.)
- **Session Management**: Group related traces for multi-step workflows

This server is one of four MCP servers in the Stepwise architecture, working alongside Gladia (STT), Horizon3 (security), and Custom API (generic HTTP client).

## Features

### 1. Trace Management
- Create new traces with unique IDs
- Group related traces by session
- Track execution status (success/error/cancelled)
- Attach metadata to traces

### 2. Event Logging
- Log events at different severity levels (info, warn, error)
- Associate events with specific traces
- Capture event metadata for debugging
- Timestamp all events automatically

### 3. Metric Recording
- Log numeric metrics (response times, token counts, etc.)
- Tag metrics for filtering and analysis
- Track performance trends over time
- Real-time metric visualization in HoneyHive dashboard

### 4. HoneyHive Dashboard Integration
All traces, events, and metrics are automatically sent to the HoneyHive platform, where you can:
- Visualize workflow execution timelines
- Analyze performance bottlenecks
- Debug failed API calls
- Monitor system health

## Installation

### Prerequisites
- Python 3.11 or higher
- HoneyHive API key ([get one here](https://www.honeyhive.ai/))
- Environment variables configured

### Local Installation

```bash
cd mcp-servers/honeyhive

# Install dependencies
pip install -r requirements.txt

# Configure environment
export HONEYHIVE_API_KEY=your_api_key_here
export HONEYHIVE_PROJECT=stepwise-agent  # or your project name

# Start server
python src/server.py
```

The server will start on port 8001.

### Docker Installation

```bash
# Build image
docker build -t honeyhive-mcp:latest .

# Run container
docker run -p 8001:8001 \
  -e HONEYHIVE_API_KEY=your_api_key_here \
  -e HONEYHIVE_PROJECT=stepwise-agent \
  honeyhive-mcp:latest
```

## Available Tools

The server exposes 4 MCP tools via JSON-RPC 2.0:

### 1. `create_trace_tool`

Create a new trace for workflow execution.

**Parameters:**
- `trace_name` (string, required): Name/description of the trace
- `session_id` (string, optional): Session ID to group related traces
- `metadata` (object, optional): Additional metadata

**Returns:**
```json
{
  "success": true,
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Trace 'API Debug Session' created successfully",
  "response": { ... }
}
```

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_trace_tool",
    "arguments": {
      "trace_name": "Debug JSONPlaceholder API",
      "session_id": "session-abc-123",
      "metadata": {
        "user": "developer@example.com",
        "workflow_type": "api_test"
      }
    }
  }
}
```

### 2. `log_event_tool`

Log an event in an existing trace.

**Parameters:**
- `event_name` (string, required): Name/description of the event
- `trace_id` (string, required): Trace ID to associate this event with
- `metadata` (object, optional): Event metadata
- `level` (string, optional): Severity level (info/warn/error, default: info)

**Returns:**
```json
{
  "success": true,
  "message": "Event 'API call completed' logged successfully to trace ...",
  "response": { ... }
}
```

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "log_event_tool",
    "arguments": {
      "event_name": "API Request Sent",
      "trace_id": "550e8400-e29b-41d4-a716-446655440000",
      "metadata": {
        "endpoint": "https://jsonplaceholder.typicode.com/users/1",
        "method": "GET"
      },
      "level": "info"
    }
  }
}
```

### 3. `log_metric_tool`

Log a numeric metric value.

**Parameters:**
- `metric_name` (string, required): Name of the metric
- `value` (float, required): Numeric value to log
- `trace_id` (string, required): Trace ID to associate this metric with
- `tags` (object, optional): Tags for filtering

**Returns:**
```json
{
  "success": true,
  "message": "Metric 'response_time' = 123.45 logged successfully to trace ...",
  "response": { ... }
}
```

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "log_metric_tool",
    "arguments": {
      "metric_name": "response_time_ms",
      "value": 245.8,
      "trace_id": "550e8400-e29b-41d4-a716-446655440000",
      "tags": {
        "endpoint": "/users/1",
        "status_code": 200
      }
    }
  }
}
```

### 4. `end_trace_tool`

Complete a trace.

**Parameters:**
- `trace_id` (string, required): Trace ID to end
- `status` (string, optional): Final status (success/error/cancelled, default: success)
- `metadata` (object, optional): Final metadata

**Returns:**
```json
{
  "success": true,
  "message": "Trace ... ended with status: success",
  "response": { ... }
}
```

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "end_trace_tool",
    "arguments": {
      "trace_id": "550e8400-e29b-41d4-a716-446655440000",
      "status": "success",
      "metadata": {
        "total_api_calls": 3,
        "total_duration_ms": 1250.5
      }
    }
  }
}
```

## Usage Example: Complete Workflow Trace

Here's how to trace a complete API debugging workflow:

```python
import httpx
import json

BASE_URL = "http://localhost:8001/mcp"

async def trace_api_workflow():
    async with httpx.AsyncClient() as client:
        # 1. Create trace
        response = await client.post(BASE_URL, json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "create_trace_tool",
                "arguments": {
                    "trace_name": "Debug JSONPlaceholder Users API",
                    "metadata": {"user": "developer@example.com"}
                }
            }
        })
        trace_id = response.json()["result"]["trace_id"]
        print(f"Created trace: {trace_id}")

        # 2. Log event: API request started
        await client.post(BASE_URL, json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": "log_event_tool",
                "arguments": {
                    "event_name": "API Request Started",
                    "trace_id": trace_id,
                    "metadata": {"endpoint": "/users/1"},
                    "level": "info"
                }
            }
        })

        # 3. Log metric: response time
        await client.post(BASE_URL, json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": "log_metric_tool",
                "arguments": {
                    "metric_name": "response_time_ms",
                    "value": 245.8,
                    "trace_id": trace_id,
                    "tags": {"status_code": 200}
                }
            }
        })

        # 4. End trace
        await client.post(BASE_URL, json={
            "jsonrpc": "2.0",
            "id": 4,
            "method": "tools/call",
            "params": {
                "name": "end_trace_tool",
                "arguments": {
                    "trace_id": trace_id,
                    "status": "success",
                    "metadata": {"total_duration_ms": 1250.5}
                }
            }
        })

        print(f"Trace complete! View in HoneyHive dashboard")
```

## Environment Variables

Required:
- `HONEYHIVE_API_KEY`: Your HoneyHive API key
- `HONEYHIVE_PROJECT`: Project name in HoneyHive (default: stepwise-agent)

Optional:
- `PORT`: Server port (default: 8001)
- `LOG_LEVEL`: Logging level (default: info)

## Health Check

The server exposes a health endpoint:

```bash
curl http://localhost:8001/health
```

Response:
```json
{
  "status": "healthy",
  "service": "honeyhive-mcp",
  "port": 8001,
  "project": "stepwise-agent"
}
```

## Testing

### Run Unit Tests

```bash
# Install test dependencies
pip install -r requirements.txt

# Run tests with coverage
pytest tests/ -v --cov=src --cov-report=term-missing

# Run specific test
pytest tests/test_tools.py::test_create_trace_success -v
```

### Test with Real HoneyHive API

```bash
# Set environment variables
export HONEYHIVE_API_KEY=your_real_api_key
export HONEYHIVE_PROJECT=your_project_name

# Start server
python src/server.py

# In another terminal, test trace creation
curl -X POST http://localhost:8001/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "create_trace_tool",
      "arguments": {
        "trace_name": "Test Trace",
        "metadata": {"test": true}
      }
    }
  }'
```

Then check your HoneyHive dashboard to see the trace!

## Integration with Stepwise Agent

The HoneyHive MCP server is automatically integrated into the Stepwise agent workflow:

1. **Agent starts workflow** → Creates trace via `create_trace_tool`
2. **Each step executes** → Logs events via `log_event_tool`
3. **Performance metrics collected** → Logged via `log_metric_tool`
4. **Workflow completes** → Ends trace via `end_trace_tool`

All tracing happens automatically - the agent orchestrator handles MCP communication.

## Architecture

```
┌─────────────────────┐
│  Stepwise Agent     │
│  (Workflow Engine)  │
└──────────┬──────────┘
           │ JSON-RPC 2.0
           │ (MCP Protocol)
           ▼
┌─────────────────────┐
│  FastMCP Server     │
│  Port 8001          │
├─────────────────────┤
│  4 Tools:           │
│  - create_trace     │
│  - log_event        │
│  - log_metric       │
│  - end_trace        │
└──────────┬──────────┘
           │ HoneyHive SDK
           │ (Python Client)
           ▼
┌─────────────────────┐
│  HoneyHive API      │
│  (Cloud Platform)   │
└─────────────────────┘
```

## Troubleshooting

### Server won't start
- Check `HONEYHIVE_API_KEY` is set
- Verify port 8001 is available: `lsof -i :8001`
- Check Python version: `python --version` (must be 3.11+)

### API key invalid
- Verify key at https://app.honeyhive.ai/settings/api-keys
- Ensure key starts with `hh_`
- Check project name matches your HoneyHive project

### Traces not appearing in dashboard
- Wait 10-30 seconds for data to sync
- Verify project name matches exactly
- Check HoneyHive dashboard filters

### Docker container unhealthy
- Check logs: `docker logs <container-id>`
- Verify environment variables passed: `docker inspect <container-id>`
- Test health endpoint: `docker exec <container-id> curl http://localhost:8001/health`

## Performance Considerations

- **Trace ID Generation**: Uses UUID4 for globally unique IDs
- **Timestamps**: All timestamps in ISO 8601 format (UTC)
- **Error Handling**: All tools return success/error status, never throw exceptions
- **Async Operations**: All tools are async for non-blocking I/O

## Development

### Project Structure
```
mcp-servers/honeyhive/
├── src/
│   ├── server.py          # FastMCP server with 4 tools
│   └── tools.py           # HoneyHive SDK integration
├── tests/
│   └── test_tools.py      # Unit tests
├── requirements.txt       # Python dependencies
├── Dockerfile            # Container image
└── README.md            # This file
```

### Adding New Tools

To add a new HoneyHive tool:

1. Add function to `src/tools.py`
2. Decorate with `@mcp.tool()` in `src/server.py`
3. Add tests to `tests/test_tools.py`
4. Update this README

## License

Part of the Stepwise Live API Debugger project for the E2B + Docker MCP Hackathon.

## Links

- [HoneyHive Documentation](https://docs.honeyhive.ai/)
- [HoneyHive Python SDK](https://github.com/honeyhiveai/python-sdk)
- [FastMCP Framework](https://github.com/jlowin/fastmcp)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
- [Stepwise Project](https://github.com/yourusername/stepwise)
