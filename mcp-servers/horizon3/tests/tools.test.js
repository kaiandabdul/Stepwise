import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runSecurityScan, getScanResults, validatePermissions } from '../src/tools.js'

// Mock environment
process.env.HORIZON3_USE_MOCK = 'true'

describe('Horizon3 MCP Server Tools', () => {
  describe('runSecurityScan', () => {
    it('should create a mock scan successfully', async () => {
      const result = await runSecurityScan({
        target: 'https://api.example.com',
        scanType: 'quick'
      })

      expect(result.success).toBe(true)
      expect(result.scanId).toBeDefined()
      expect(result.scanId).toMatch(/^scan_/)
      expect(result.status).toBe('initiated')
      expect(result.message).toContain('https://api.example.com')
      expect(result.estimatedTime).toBe('30s')
      expect(result.note).toContain('mock')
    })

    it('should create different scan types', async () => {
      const quickScan = await runSecurityScan({
        target: 'https://api.example.com',
        scanType: 'quick'
      })

      const fullScan = await runSecurityScan({
        target: 'https://api.example.com',
        scanType: 'full'
      })

      const complianceScan = await runSecurityScan({
        target: 'https://api.example.com',
        scanType: 'compliance'
      })

      expect(quickScan.success).toBe(true)
      expect(fullScan.success).toBe(true)
      expect(complianceScan.success).toBe(true)
    })

    it('should default to quick scan type', async () => {
      const result = await runSecurityScan({
        target: 'https://api.example.com'
      })

      expect(result.success).toBe(true)
      expect(result.scanId).toBeDefined()
    })
  })

  describe('getScanResults', () => {
    it('should retrieve mock scan results', async () => {
      // First create a scan
      const createResult = await runSecurityScan({
        target: 'https://api.example.com',
        scanType: 'quick'
      })

      // Then retrieve it
      const getResult = await getScanResults({
        scanId: createResult.scanId
      })

      expect(getResult.success).toBe(true)
      expect(getResult.results).toBeDefined()
      expect(getResult.results.scanId).toBe(createResult.scanId)
      expect(getResult.results.target).toBe('https://api.example.com')
      expect(getResult.results.status).toBe('completed')
      expect(getResult.results.findings).toBeInstanceOf(Array)
      expect(getResult.results.findings.length).toBeGreaterThan(0)
    })

    it('should return realistic mock findings', async () => {
      const createResult = await runSecurityScan({
        target: 'https://api.example.com'
      })

      const getResult = await getScanResults({
        scanId: createResult.scanId
      })

      const findings = getResult.results.findings

      // Check for low severity finding
      const lowFinding = findings.find(f => f.severity === 'low')
      expect(lowFinding).toBeDefined()
      expect(lowFinding.title).toBe('Missing Security Headers')
      expect(lowFinding.description).toContain('security headers')
      expect(lowFinding.remediation).toContain('X-Content-Type-Options')

      // Check for info finding
      const infoFinding = findings.find(f => f.severity === 'info')
      expect(infoFinding).toBeDefined()
      expect(infoFinding.title).toBe('TLS Configuration')
      expect(infoFinding.status).toBe('pass')
    })

    it('should include summary with severity counts', async () => {
      const createResult = await runSecurityScan({
        target: 'https://api.example.com'
      })

      const getResult = await getScanResults({
        scanId: createResult.scanId
      })

      const summary = getResult.results.summary
      expect(summary).toBeDefined()
      expect(summary.critical).toBe(0)
      expect(summary.high).toBe(0)
      expect(summary.medium).toBe(0)
      expect(summary.low).toBe(1)
      expect(summary.info).toBe(1)
    })

    it('should include timestamps', async () => {
      const createResult = await runSecurityScan({
        target: 'https://api.example.com'
      })

      const getResult = await getScanResults({
        scanId: createResult.scanId
      })

      expect(getResult.results.startedAt).toBeDefined()
      expect(getResult.results.completedAt).toBeDefined()
      expect(new Date(getResult.results.startedAt)).toBeInstanceOf(Date)
      expect(new Date(getResult.results.completedAt)).toBeInstanceOf(Date)
    })

    it('should return error for non-existent scan', async () => {
      const result = await getScanResults({
        scanId: 'scan_nonexistent'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Scan not found')
      expect(result.results).toBeNull()
    })
  })

  describe('validatePermissions', () => {
    it('should validate permissions successfully', async () => {
      const result = await validatePermissions({
        userId: 'user123',
        resource: 'api.example.com',
        action: 'read'
      })

      expect(result.success).toBe(true)
      expect(result.userId).toBe('user123')
      expect(result.resource).toBe('api.example.com')
      expect(result.action).toBe('read')
      expect(result.allowed).toBeDefined()
      expect(typeof result.allowed).toBe('boolean')
      expect(result.reason).toBeDefined()
      expect(result.note).toContain('mock')
    })

    it('should test multiple permission scenarios', async () => {
      const results = []

      // Run multiple tests to check randomization
      for (let i = 0; i < 10; i++) {
        const result = await validatePermissions({
          userId: `user${i}`,
          resource: 'api.example.com',
          action: 'write'
        })
        results.push(result.allowed)
      }

      // Should have a mix of allowed/denied (statistically)
      const allowedCount = results.filter(r => r === true).length
      expect(allowedCount).toBeGreaterThan(0) // At least some allowed
    })

    it('should provide appropriate reasons', async () => {
      const result = await validatePermissions({
        userId: 'testuser',
        resource: 'sensitive-data',
        action: 'delete'
      })

      if (result.allowed) {
        expect(result.reason).toBe('User has required permissions')
      } else {
        expect(result.reason).toBe('Insufficient permissions')
      }
    })

    it('should handle different action types', async () => {
      const actions = ['read', 'write', 'delete', 'update', 'create']

      for (const action of actions) {
        const result = await validatePermissions({
          userId: 'user123',
          resource: 'api-resource',
          action
        })

        expect(result.success).toBe(true)
        expect(result.action).toBe(action)
      }
    })
  })

  describe('Real API mode (mocked fetch)', () => {
    beforeEach(() => {
      // Reset mock flag
      process.env.HORIZON3_USE_MOCK = 'false'
      process.env.HORIZON3_API_KEY = 'test_api_key_123'
    })

    it('should handle successful API scan creation', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            scan_id: 'real_scan_123',
            status: 'pending'
          })
        })
      )

      const result = await runSecurityScan({
        target: 'https://api.example.com',
        scanType: 'quick'
      })

      expect(result.success).toBe(true)
      expect(result.scanId).toBe('real_scan_123')
      expect(result.status).toBe('pending')
      expect(fetch).toHaveBeenCalledWith(
        'https://api.horizon3.ai/v1/scans',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_api_key_123'
          })
        })
      )
    })

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401
        })
      )

      const result = await runSecurityScan({
        target: 'https://api.example.com'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('401')
    })

    it('should handle network errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      )

      const result = await runSecurityScan({
        target: 'https://api.example.com'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network error')
    })

    it('should retrieve real API scan results', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            scan_id: 'real_scan_123',
            status: 'completed',
            findings: [
              {
                severity: 'high',
                title: 'SQL Injection',
                description: 'Potential SQL injection vulnerability'
              }
            ]
          })
        })
      )

      const result = await getScanResults({
        scanId: 'real_scan_123'
      })

      expect(result.success).toBe(true)
      expect(result.results.scan_id).toBe('real_scan_123')
      expect(fetch).toHaveBeenCalledWith(
        'https://api.horizon3.ai/v1/scans/real_scan_123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_api_key_123'
          })
        })
      )
    })

    // Reset to mock mode
    afterEach(() => {
      process.env.HORIZON3_USE_MOCK = 'true'
      delete process.env.HORIZON3_API_KEY
    })
  })
})
