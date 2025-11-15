# Custom API MCP Server

Generic HTTP client MCP server for calling arbitrary REST APIs. Provides a unified interface for making HTTP requests with built-in security features.

## Overview

- **Port**: 8003
- **Protocol**: JSON-RPC 2.0 (FastMCP framework)
- **Language**: Node.js (ES Modules)
- **Tool**: `call_api` - Generic HTTP client supporting GET, POST, PUT, PATCH, DELETE

## Features

- **HTTP Methods**: Support for GET, POST, PUT, PATCH, DELETE
- **Request Timeout**: Configurable timeout with AbortController
- **Response Parsing**: Automatic JSON/text parsing based on Content-Type
- **Security**:
  - Blocks private IP addresses (10.x, 172.16-31.x, 192.168.x)
  - Blocks localhost and loopback addresses
  - Blocks AWS metadata service (169.254.169.254)
  - Warns on non-HTTPS URLs (except whitelisted domains)
- **Observability**: Request/response logging, duration tracking
- **User-Agent**: Identifies as 'Stepwise-Agent/1.0'

## Installation

```bash
cd /Users/codewithabdul/LockeIn/Stepwise/mcp-servers/custom-api
npm install
```

## Usage

### Start Server

```bash
npm start
# Server runs on http://localhost:8003
```

### Development Mode (auto-reload)

```bash
npm run dev
```

### Health Check

```bash
curl http://localhost:8003/health
# Response: {"status":"healthy","service":"custom-api-mcp"}
```

## Tool Documentation

### `call_api`

Make HTTP requests to any REST API with security controls.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| method | string | Yes | HTTP method (GET, POST, PUT, PATCH, DELETE) |
| url | string | Yes | Full URL to call (must be HTTPS for security) |
| headers | object | No | HTTP headers as key-value pairs (default: {}) |
| body | object | No | Request body for POST/PUT/PATCH (default: null) |
| timeout | number | No | Request timeout in milliseconds (default: 30000) |

**Response:**

```json
{
  "success": true,
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    ...
  },
  "data": { ... },
  "duration": "123ms",
  "metadata": {
    "method": "GET",
    "url": "https://...",
    "timestamp": "2025-11-15T12:00:00.000Z"
  }
}
```

## Example: JSON-RPC Calls

### GET Request (JSONPlaceholder API)

```bash
curl -X POST http://localhost:8003/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "call_api",
      "arguments": {
        "method": "GET",
        "url": "https://jsonplaceholder.typicode.com/users/1"
      }
    }
  }'
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "status": 200,
    "statusText": "OK",
    "data": {
      "id": 1,
      "name": "Leanne Graham",
      "username": "Bret",
      "email": "Sincere@april.biz",
      ...
    },
    "duration": "245ms"
  }
}
```

### POST Request with Body

```bash
curl -X POST http://localhost:8003/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "call_api",
      "arguments": {
        "method": "POST",
        "url": "https://jsonplaceholder.typicode.com/posts",
        "body": {
          "title": "Test Post",
          "body": "This is a test",
          "userId": 1
        }
      }
    }
  }'
```

### Custom Headers and Timeout

```bash
curl -X POST http://localhost:8003/call \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "call_api",
      "arguments": {
        "method": "GET",
        "url": "https://api.github.com/users/github",
        "headers": {
          "Accept": "application/vnd.github.v3+json"
        },
        "timeout": 10000
      }
    }
  }'
```

## Security Features

### Blocked Requests

The server automatically blocks requests to:

- **Localhost**: localhost, 127.0.0.1, 0.0.0.0
- **Private IPs**:
  - 10.0.0.0/8 (10.x.x.x)
  - 172.16.0.0/12 (172.16-31.x.x)
  - 192.168.0.0/16 (192.168.x.x)
- **Metadata Services**: 169.254.169.254 (AWS/Azure/GCP metadata)

**Example Blocked Request:**

```bash
curl -X POST http://localhost:8003/call \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "url": "http://localhost:8080/admin"
  }'

# Response:
# {
#   "success": false,
#   "error": "Access to private IP addresses is blocked: localhost",
#   "status": 500
# }
```

### HTTPS Enforcement

Non-HTTPS URLs trigger a warning (except for whitelisted domains like jsonplaceholder.typicode.com). This helps prevent sensitive data leakage.

## Docker Usage

### Build Image

```bash
docker build -t custom-api-mcp:latest .
```

### Run Container

```bash
docker run -p 8003:8003 custom-api-mcp:latest
```

### With Environment Variables

```bash
docker run -p 8003:8003 \
  --env-file ../../.env \
  custom-api-mcp:latest
```

### Health Check

The Docker container includes automatic health checks:

```bash
docker ps  # Check HEALTH status column
```

## Testing

### Run Unit Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

### Test Coverage Includes

- ✅ Successful API calls (GET, POST)
- ✅ JSON and text response parsing
- ✅ Security: Blocked IPs (localhost, private ranges, metadata service)
- ✅ Error handling (network errors, timeouts)
- ✅ Custom headers
- ✅ Request timeout with AbortController

## Integration with Stepwise Agent

The Custom API MCP server is part of the Stepwise Live API Debugger architecture:

1. **User Input**: "Test the JSONPlaceholder API for user 1"
2. **Agent Planning**: LLM generates workflow with API call step
3. **MCP Communication**: Agent calls `call_api` via JSON-RPC
4. **Execution**: Custom API server makes HTTP request
5. **Tracing**: Results logged to HoneyHive MCP
6. **Response**: Results returned to user

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8003
lsof -ti:8003 | xargs kill

# Or change port
PORT=8004 npm start
```

### Network Timeout

Increase timeout parameter:

```json
{
  "method": "GET",
  "url": "https://slow-api.com",
  "timeout": 60000
}
```

### JSON Parse Error

The server automatically handles both JSON and text responses. If you receive a parse error, check the API's Content-Type header.

## Development

### Project Structure

```
custom-api/
├── src/
│   ├── index.js    # FastMCP server, tool definitions
│   └── tools.js    # callApi implementation
├── tests/
│   └── tools.test.js  # Unit tests
├── package.json
├── Dockerfile
└── README.md
```

### Adding New Features

1. Implement function in `src/tools.js`
2. Add test in `tests/tools.test.js`
3. Update this README
4. Run tests: `npm test`

## License

Part of the Stepwise project for E2B + Docker MCP Hackathon.
