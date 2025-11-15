import { FastMCP } from 'fastmcp'
import dotenv from 'dotenv'
import { callApi } from './tools.js'

dotenv.config()

const mcp = new FastMCP({
  name: 'custom-api-mcp-server',
  version: '1.0.0'
})

mcp.addTool({
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

// Start MCP server
const PORT = process.env.PORT || 8003
await mcp.start({
  transportType: 'httpStream',
  httpStream: {
    port: PORT,
    endpoint: '/mcp'
  }
})

console.log(`Custom API MCP Server running on port ${PORT}`)
console.log(`MCP endpoint: http://localhost:${PORT}/mcp`)
