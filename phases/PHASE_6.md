# Phase 6: Security & Robustness

**Duration**: 4-6 hours
**Priority**: High
**Risk Level**: Medium
**Prerequisites**: Phase 4 complete (Agent functional)

## Overview

Implement security best practices including secrets management, input validation, log scrubbing, and rate limiting.

## Objectives

1. Validate all secrets on startup
2. Implement input validation and sanitization
3. Add log scrubbing for sensitive data
4. Implement rate limiting
5. Test security boundaries

## Key Deliverables

### Secrets Validation (`agent/src/security/secrets.js`)

```javascript
import { z } from 'zod'

const SecretsSchema = z.object({
  E2B_API_KEY: z.string().min(10),
  GLADIA_API_KEY: z.string().min(10),
  HONEYHIVE_API_KEY: z.string().min(10),
  OPENAI_API_KEY: z.string().min(10).optional(),
  ANTHROPIC_API_KEY: z.string().min(10).optional()
}).refine(data => data.OPENAI_API_KEY || data.ANTHROPIC_API_KEY, {
  message: "Either OPENAI_API_KEY or ANTHROPIC_API_KEY must be provided"
})

export function validateSecrets() {
  try {
    SecretsSchema.parse(process.env)
    console.log('✓ All secrets validated')
  } catch (error) {
    console.error('❌ Secret validation failed:', error.errors)
    process.exit(1)
  }
}
```

### Input Validation (`agent/src/security/validator.js`)

```javascript
const PRIVATE_IP_REGEX = /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/
const LOCALHOST_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1']

export function validateUrl(url) {
  try {
    const parsed = new URL(url)

    // Block localhost
    if (LOCALHOST_HOSTS.includes(parsed.hostname)) {
      throw new Error('Access to localhost is blocked')
    }

    // Block private IPs
    if (PRIVATE_IP_REGEX.test(parsed.hostname)) {
      throw new Error('Access to private IP addresses is blocked')
    }

    // Block metadata endpoint (cloud)
    if (parsed.hostname === '169.254.169.254') {
      throw new Error('Access to metadata endpoint is blocked')
    }

    return true
  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`)
  }
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input

  // Limit length
  if (input.length > 10000) {
    throw new Error('Input too long (max 10000 characters)')
  }

  // Remove null bytes
  return input.replace(/\0/g, '')
}
```

### Log Scrubbing (`agent/src/security/scrubber.js`)

```javascript
const SENSITIVE_PATTERNS = {
  api_key: /([a-z]+_)?api[_-]?key["\s:=]+([a-zA-Z0-9_-]{20,})/gi,
  bearer: /bearer\s+([a-zA-Z0-9._-]+)/gi,
  password: /(password|passwd|pwd)["\s:=]+([^\s,}]+)/gi,
  secret: /secret["\s:=]+([^\s,}]+)/gi
}

export function scrubLogs(text) {
  let scrubbed = text

  for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    scrubbed = scrubbed.replace(pattern, `[REDACTED_${type.toUpperCase()}]`)
  }

  return scrubbed
}

// Wrap console.log
const originalLog = console.log
console.log = (...args) => {
  const scrubbed = args.map(arg =>
    typeof arg === 'string' ? scrubLogs(arg) : arg
  )
  originalLog(...scrubbed)
}
```

### Rate Limiting (`agent/src/api/middleware.js`)

```javascript
import rateLimit from 'express-rate-limit'

export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
})
```

### Apply Security (`agent/src/index.js`)

```javascript
import { validateSecrets } from './security/secrets.js'
import { validateUrl, sanitizeInput } from './security/validator.js'
import './security/scrubber.js' // Auto-applies log scrubbing
import { rateLimiter } from './api/middleware.js'

// Validate secrets on startup
validateSecrets()

// Apply rate limiting
app.use('/query', rateLimiter)

// Validate input
app.post('/query', (req, res, next) => {
  try {
    req.body.input = sanitizeInput(req.body.input)
    next()
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})
```

## Testing Security

### Test URL Validation

```bash
# Should be blocked
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{"input": "Call http://localhost:8080", "session_id": "test"}'

# Should return error: "Access to localhost is blocked"
```

### Test Rate Limiting

```bash
# Send 15 requests rapidly
for i in {1..15}; do
  curl -X POST http://localhost:3000/query \
    -H "Content-Type: application/json" \
    -d '{"input": "test", "session_id": "test"}' &
done

# Requests 11-15 should return 429 Too Many Requests
```

### Test Log Scrubbing

```bash
# Check logs for exposed secrets
grep -r "GLADIA_API_KEY" logs/
grep -r "sk-" logs/  # OpenAI key pattern

# Should find no matches (all redacted)
```

## Success Criteria

- [ ] Cannot access localhost or private IPs through custom API tool
- [ ] API keys never appear in logs
- [ ] Rate limiting blocks excessive requests
- [ ] Input validation rejects malicious payloads
- [ ] All Docker containers run as non-root
- [ ] Can run Horizon3 security scan on the agent itself

## Next Steps

**[Phase 7: Testing & Documentation](./PHASE_7.md)**
