# Horizon3 MCP Server

MCP (Model Context Protocol) server for Horizon3.ai NodeZero security scanning capabilities. Provides API endpoint security scanning, vulnerability detection, and RBAC permission validation.

## Features

- **Security Scanning**: Run comprehensive security scans on API endpoints
- **Vulnerability Detection**: Identify security issues with severity classification
- **RBAC Validation**: Validate user permissions for resource access
- **Mock Mode**: Full demo functionality without API access
- **Real API Support**: Production-ready Horizon3.ai API integration

## Architecture

### MCP Tools (3 Security Tools)

1. **run_security_scan** - Initiate security scan on target endpoint
2. **get_scan_results** - Retrieve scan results with findings
3. **validate_permissions** - RBAC permission validation

### Scan Types

- **quick**: Fast security scan for common vulnerabilities (~30s)
- **full**: Comprehensive scan including deep analysis (~5min)
- **compliance**: Compliance-focused scan (PCI-DSS, SOC2, etc.)

## Installation

```bash
cd mcp-servers/horizon3
npm install
```

## Configuration

Create `.env` file or set environment variables:

```bash
# Required for Real API Mode
HORIZON3_API_KEY=your_api_key_here

# Optional: Force mock mode (default: auto-detect)
HORIZON3_USE_MOCK=false

# Server port (default: 8002)
PORT=8002
```

### Mock vs Real API Mode

**Mock Mode** (Default if no API key):
- No external API calls
- Realistic demo data
- Instant scan results
- Perfect for testing and demos
- Enabled when: `!HORIZON3_API_KEY || HORIZON3_USE_MOCK=true`

**Real API Mode**:
- Live Horizon3.ai API integration
- Actual security scans
- Real vulnerability detection
- Requires valid API key
- Enabled when: `HORIZON3_API_KEY set && HORIZON3_USE_MOCK=false`

## Usage

### Start Server

```bash
# Mock mode (demo)
HORIZON3_USE_MOCK=true npm start

# Real API mode
HORIZON3_API_KEY=your_key npm start

# Development with auto-reload
npm run dev
```

Server runs on `http://localhost:8002`

### Health Check

```bash
curl http://localhost:8002/health
```

Response:
```json
{
  "status": "healthy",
  "service": "horizon3-mcp"
}
```

## MCP Tool Usage

### 1. Run Security Scan

**JSON-RPC Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "run_security_scan",
    "arguments": {
      "target": "https://api.example.com",
      "scanType": "quick"
    }
  }
}
```

**Response (Mock Mode):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "success": true,
    "scanId": "scan_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "initiated",
    "message": "Security scan started for https://api.example.com",
    "estimatedTime": "30s",
    "note": "Using mock scan for demo (Horizon3 API not configured)"
  }
}
```

### 2. Get Scan Results

**JSON-RPC Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_scan_results",
    "arguments": {
      "scanId": "scan_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    }
  }
}
```

**Response (Mock Mode):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "success": true,
    "results": {
      "scanId": "scan_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "target": "https://api.example.com",
      "scanType": "quick",
      "status": "completed",
      "findings": [
        {
          "severity": "low",
          "title": "Missing Security Headers",
          "description": "Server does not set recommended security headers",
          "remediation": "Add X-Content-Type-Options, X-Frame-Options, etc."
        },
        {
          "severity": "info",
          "title": "TLS Configuration",
          "description": "TLS 1.2+ is properly configured",
          "status": "pass"
        }
      ],
      "summary": {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 1,
        "info": 1
      },
      "startedAt": "2025-11-15T10:30:00.000Z",
      "completedAt": "2025-11-15T10:30:05.000Z"
    }
  }
}
```

### 3. Validate Permissions

**JSON-RPC Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "validate_permissions",
    "arguments": {
      "userId": "user123",
      "resource": "api.example.com",
      "action": "read"
    }
  }
}
```

**Response (Mock Mode):**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "success": true,
    "allowed": true,
    "userId": "user123",
    "resource": "api.example.com",
    "action": "read",
    "reason": "User has required permissions",
    "note": "Using mock RBAC for demo"
  }
}
```

## Mock Scan Output Format

Mock scans return realistic security findings:

**Severity Levels:**
- `critical`: Immediate action required
- `high`: High risk vulnerabilities
- `medium`: Moderate risk issues
- `low`: Minor security concerns
- `info`: Informational findings

**Example Findings:**
```javascript
{
  severity: 'low',
  title: 'Missing Security Headers',
  description: 'Server does not set recommended security headers',
  remediation: 'Add X-Content-Type-Options, X-Frame-Options, etc.'
}
```

**Summary Counts:**
```javascript
{
  critical: 0,
  high: 0,
  medium: 0,
  low: 1,
  info: 1
}
```

## RBAC Validation Examples

Mock RBAC validation simulates permission checks:

**Allowed:**
```json
{
  "allowed": true,
  "reason": "User has required permissions"
}
```

**Denied:**
```json
{
  "allowed": false,
  "reason": "Insufficient permissions"
}
```

**Common Actions:**
- `read`: View resource
- `write`: Modify resource
- `delete`: Remove resource
- `update`: Update resource
- `create`: Create new resource

## Docker Usage

### Build Image

```bash
docker build -t horizon3-mcp:latest .
```

### Run Container

```bash
# Mock mode
docker run -p 8002:8002 -e HORIZON3_USE_MOCK=true horizon3-mcp:latest

# Real API mode
docker run -p 8002:8002 \
  -e HORIZON3_API_KEY=your_key \
  -e HORIZON3_USE_MOCK=false \
  horizon3-mcp:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  horizon3-mcp:
    build: .
    ports:
      - "8002:8002"
    environment:
      - HORIZON3_API_KEY=${HORIZON3_API_KEY}
      - HORIZON3_USE_MOCK=${HORIZON3_USE_MOCK:-true}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8002/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

### Test Coverage

Tests include:
- Mock scan creation and retrieval
- Realistic findings generation
- RBAC validation (allowed/denied)
- Real API mode (with mocked fetch)
- Error handling
- All scan types (quick, full, compliance)

## API Integration

### Horizon3.ai NodeZero API

**Base URL:** `https://api.horizon3.ai/v1`

**Endpoints Used:**
- `POST /scans` - Create security scan
- `GET /scans/{scanId}` - Retrieve scan results

**Authentication:**
```
Authorization: Bearer YOUR_API_KEY
```

**Request Body (Create Scan):**
```json
{
  "target": "https://api.example.com",
  "scan_type": "quick"
}
```

## Error Handling

All tools return structured error responses:

```json
{
  "success": false,
  "error": "Error message here",
  "scanId": null
}
```

**Common Errors:**
- `Scan not found`: Invalid scanId
- `Horizon3 API error: 401`: Invalid API key
- `Horizon3 API error: 429`: Rate limit exceeded
- `Network error`: Connection failed

## Development

### Project Structure

```
horizon3/
├── src/
│   ├── index.js          # MCP server setup
│   └── tools.js          # Tool implementations
├── tests/
│   └── tools.test.js     # Unit tests
├── Dockerfile            # Container image
├── package.json          # Dependencies
└── README.md             # This file
```

### Adding New Tools

1. Implement function in `src/tools.js`
2. Register tool in `src/index.js`
3. Add tests in `tests/tools.test.js`
4. Update README with usage

## Troubleshooting

### Server won't start
- Check port 8002 is not in use: `lsof -i :8002`
- Verify Node.js version: `node --version` (requires 18+)

### Mock mode not working
- Ensure `HORIZON3_USE_MOCK=true` is set
- Check env vars: `printenv | grep HORIZON3`

### Real API errors
- Verify API key is valid
- Check API quota/rate limits
- Test with curl: `curl -H "Authorization: Bearer KEY" https://api.horizon3.ai/v1/scans`

### Docker build fails
- Run `npm install` locally first
- Check Dockerfile syntax
- Verify base image: `docker pull node:18-slim`

## Security Considerations

- API keys stored in environment variables (never in code)
- No sensitive data in logs
- Health endpoint requires no authentication (safe)
- Rate limiting recommended for production

## License

Part of Stepwise MCP Debugger project.

## Support

For issues or questions:
- Check PHASE_2.md implementation guide
- Review MCP_SERVERS.md documentation
- Test with mock mode first before real API

---

**Status:** Production-ready with mock mode
**Version:** 1.0.0
**Last Updated:** November 15, 2025
