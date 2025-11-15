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
