import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { callApi } from '../src/tools.js'

describe('Custom API MCP Server - callApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should successfully call an API and return JSON response', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ userId: 1, name: 'John Doe' })
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const result = await callApi({
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/users/1'
    })

    expect(result.success).toBe(true)
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ userId: 1, name: 'John Doe' })
    expect(result.metadata.method).toBe('GET')
    expect(result.duration).toMatch(/^\d+ms$/)
  })

  it('should handle POST request with body', async () => {
    const mockResponse = {
      ok: true,
      status: 201,
      statusText: 'Created',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({ id: 101, title: 'New Post' })
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const result = await callApi({
      method: 'POST',
      url: 'https://jsonplaceholder.typicode.com/posts',
      body: { title: 'New Post', body: 'Content' }
    })

    expect(result.success).toBe(true)
    expect(result.status).toBe(201)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://jsonplaceholder.typicode.com/posts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'New Post', body: 'Content' })
      })
    )
  })

  it('should handle text response (non-JSON)', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'text/plain']]),
      text: async () => 'Plain text response'
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    const result = await callApi({
      method: 'GET',
      url: 'https://example.com/text'
    })

    expect(result.success).toBe(true)
    expect(result.data).toBe('Plain text response')
  })

  it('should block localhost requests', async () => {
    const result = await callApi({
      method: 'GET',
      url: 'http://localhost:8080/api'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Access to private IP addresses is blocked')
  })

  it('should block 127.0.0.1 requests', async () => {
    const result = await callApi({
      method: 'GET',
      url: 'http://127.0.0.1:8080/api'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Access to private IP addresses is blocked')
  })

  it('should block private IP ranges (10.x)', async () => {
    const result = await callApi({
      method: 'GET',
      url: 'http://10.0.0.1/api'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Access to private IP addresses is blocked')
  })

  it('should block private IP ranges (192.168.x)', async () => {
    const result = await callApi({
      method: 'GET',
      url: 'http://192.168.1.1/api'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Access to private IP addresses is blocked')
  })

  it('should block private IP ranges (172.16-31.x)', async () => {
    const result = await callApi({
      method: 'GET',
      url: 'http://172.16.0.1/api'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Access to private IP addresses is blocked')
  })

  it('should block metadata service IP', async () => {
    const result = await callApi({
      method: 'GET',
      url: 'http://169.254.169.254/latest/meta-data'
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Access to private IP addresses is blocked')
  })

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await callApi({
      method: 'GET',
      url: 'https://example.com/api'
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
    expect(result.status).toBe(500)
  })

  it('should handle timeout errors', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const error = new Error('The operation was aborted')
          error.name = 'AbortError'
          reject(error)
        }, 100)
      })
    })

    const result = await callApi({
      method: 'GET',
      url: 'https://example.com/slow-api',
      timeout: 50
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Request timed out')
    expect(result.status).toBe(408)
  })

  it('should set User-Agent header', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({})
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    await callApi({
      method: 'GET',
      url: 'https://example.com/api'
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Stepwise-Agent/1.0'
        })
      })
    )
  })

  it('should merge custom headers with defaults', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: async () => ({})
    }

    global.fetch = vi.fn().mockResolvedValue(mockResponse)

    await callApi({
      method: 'GET',
      url: 'https://example.com/api',
      headers: { 'Authorization': 'Bearer token123' }
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'Stepwise-Agent/1.0',
          'Authorization': 'Bearer token123'
        })
      })
    )
  })
})
