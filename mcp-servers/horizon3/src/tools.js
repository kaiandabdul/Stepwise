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
