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
