# SECURITY.md

## Security, Secrets Management, Isolation & RBAC

### Table of Contents
1. [Security Overview and Threat Model](#security-overview-and-threat-model)
2. [Secrets Management](#secrets-management)
3. [E2B Sandbox Isolation](#e2b-sandbox-isolation)
4. [Docker Container Security](#docker-container-security)
5. [Input Validation and Sanitization](#input-validation-and-sanitization)
6. [Log Scrubbing and Data Privacy](#log-scrubbing-and-data-privacy)
7. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
8. [Rate Limiting and Abuse Prevention](#rate-limiting-and-abuse-prevention)
9. [Secure Communication](#secure-communication)
10. [Security Testing and Monitoring](#security-testing-and-monitoring)

---

## 1. Security Overview and Threat Model

### 1.1 Attack Surface

**Entry Points**:
1. Frontend interface (Gradio)
2. Agent backend API (FastAPI/Express)
3. E2B sandbox environment
4. Docker containers
5. MCP servers
6. External API connections

### 1.2 Threat Actors

- **Malicious Users**: Submitting harmful inputs to extract secrets or cause damage
- **Compromised External APIs**: Third-party APIs sending malicious responses
- **Container Escape Attempts**: Trying to break out of Docker isolation
- **Network Eavesdropping**: Intercepting API keys or sensitive data
- **Resource Exhaustion**: DDoS attacks or infinite loops

### 1.3 Security Goals

1. **Isolation**: Each session completely isolated from others
2. **Confidentiality**: API keys never exposed to users
3. **Integrity**: Workflows cannot be tampered with
4. **Availability**: Rate limiting prevents abuse
5. **Auditability**: All actions logged immutably

### 1.4 Defense-in-Depth Strategy

```
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Input Validation                               │
│ - Sanitize user input                                   │
│ - Validate URLs and parameters                          │
│ - Rate limiting                                         │
└─────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Authentication & Authorization                 │
│ - User authentication                                   │
│ - Session validation                                    │
│ - RBAC checks                                           │
└─────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Network Isolation (E2B)                        │
│ - Whitelist allowed domains                             │
│ - Block private IPs                                     │
│ - Firewall rules                                        │
└─────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Container Isolation (Docker)                   │
│ - Non-root execution                                    │
│ - Read-only filesystem                                  │
│ - Resource limits                                       │
└─────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 5: Secrets Management                             │
│ - Runtime injection only                                │
│ - No secrets in code/logs                               │
│ - Secret rotation                                       │
└─────────────────────────────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 6: Audit Logging                                  │
│ - All actions logged                                    │
│ - Sensitive data scrubbed                               │
│ - Immutable audit trail                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Secrets Management

### 2.1 Environment Variables

**.env file (NEVER commit)**:
```bash
# E2B
E2B_API_KEY=e2b_xxxxxxxxxxxxxxxxxxxxx

# Sponsor APIs
GLADIA_API_KEY=gladia_xxxxxxxxxxxxxxxxxxxxx
HONEYHIVE_API_KEY=hh_xxxxxxxxxxxxxxxxxxxxx
HORIZON3_API_KEY=h3_xxxxxxxxxxxxxxxxxxxxx

# LLM Provider
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxx
```

**.env.example (Safe to commit)**:
```bash
E2B_API_KEY=your_e2b_api_key_here
GLADIA_API_KEY=your_gladia_api_key_here
HONEYHIVE_API_KEY=your_honeyhive_api_key_here
HORIZON3_API_KEY=your_horizon3_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

**.gitignore**:
```
.env
.env.local
.env.production
*.env
```

### 2.2 Loading Secrets Safely

**Node.js**:
```javascript
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

// Validate secrets schema
const SecretsSchema = z.object({
  E2B_API_KEY: z.string().min(10),
  GLADIA_API_KEY: z.string().min(10),
  HONEYHIVE_API_KEY: z.string().min(10),
  HORIZON3_API_KEY: z.string().min(10),
  OPENAI_API_KEY: z.string().min(10)
})

try {
  const secrets = SecretsSchema.parse({
    E2B_API_KEY: process.env.E2B_API_KEY,
    GLADIA_API_KEY: process.env.GLADIA_API_KEY,
    HONEYHIVE_API_KEY: process.env.HONEYHIVE_API_KEY,
    HORIZON3_API_KEY: process.env.HORIZON3_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
  })

  console.log('✓ All secrets validated')
} catch (error) {
  console.error('✗ Secret validation failed:', error.message)
  process.exit(1)
}
```

**Python**:
```python
import os
from dotenv import load_dotenv

load_dotenv()

REQUIRED_SECRETS = [
    'E2B_API_KEY',
    'GLADIA_API_KEY',
    'HONEYHIVE_API_KEY',
    'HORIZON3_API_KEY',
    'OPENAI_API_KEY'
]

def validate_secrets():
    """Validate all required secrets are present"""
    missing = []

    for secret in REQUIRED_SECRETS:
        value = os.getenv(secret)
        if not value or len(value) < 10:
            missing.append(secret)

    if missing:
        raise ValueError(f"Missing or invalid secrets: {', '.join(missing)}")

    print("✓ All secrets validated")

validate_secrets()
```

### 2.3 Injecting Secrets into E2B

```javascript
import { Sandbox } from '@e2b/sdk'

const sandbox = await Sandbox.create({
  envVars: {
    GLADIA_API_KEY: process.env.GLADIA_API_KEY,
    HONEYHIVE_API_KEY: process.env.HONEYHIVE_API_KEY,
    HORIZON3_API_KEY: process.env.HORIZON3_API_KEY
  }
})

// Secrets are now available in sandbox but NOT in logs
```

### 2.4 Secret Rotation

```javascript
class SecretManager {
  constructor() {
    this.secrets = new Map()
    this.rotationSchedule = new Map()
  }

  async rotateSecret(secretName, newValue) {
    // Validate new value
    if (!newValue || newValue.length < 10) {
      throw new Error('Invalid secret value')
    }

    // Update in memory
    this.secrets.set(secretName, newValue)

    // Update in E2B sandbox
    if (this.currentSandbox) {
      await this.currentSandbox.restart({
        envVars: {
          [secretName]: newValue
        }
      })
    }

    // Log rotation (without exposing value)
    await honeyhive.logEvent({
      event_name: 'secret_rotated',
      metadata: {
        secret_name: secretName,
        rotated_at: new Date().toISOString()
      }
    })

    console.log(`Secret ${secretName} rotated successfully`)
  }

  scheduleRotation(secretName, intervalDays = 90) {
    const intervalMs = intervalDays * 24 * 60 * 60 * 1000

    const interval = setInterval(async () => {
      console.log(`Rotating ${secretName} (scheduled)`)
      // Trigger rotation workflow
      await this.triggerRotationWorkflow(secretName)
    }, intervalMs)

    this.rotationSchedule.set(secretName, interval)
  }
}
```

---

## 3. E2B Sandbox Isolation

### 3.1 Network Restrictions

```javascript
const sandbox = await Sandbox.create({
  // Only allow these domains
  networkAccess: {
    allowedDomains: [
      'api.gladia.io',
      'api.honeyhive.ai',
      'api.horizon3.ai',
      'api.openai.com'
    ],
    blockPrivateIPs: true,  // Block 192.168.x.x, 10.x.x.x, 127.0.0.1
    blockLocalhostPorts: true
  }
})
```

**Validate URLs before calling**:
```javascript
function validateURL(url) {
  const parsed = new URL(url)

  // Block private IPs
  const privateIPRanges = [
    /^127\./,  // localhost
    /^10\./,   // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,  // 172.16.0.0/12
    /^192\.168\./  // 192.168.0.0/16
  ]

  if (privateIPRanges.some(range => range.test(parsed.hostname))) {
    throw new Error('Cannot access private IP ranges')
  }

  // Only allow HTTPS (except for local dev)
  if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('Only HTTPS URLs allowed in production')
  }

  return true
}
```

### 3.2 Resource Limits

```javascript
const sandbox = await Sandbox.create({
  cpuLimit: 2,        // 2 CPU cores
  memoryLimit: '4g',  // 4GB RAM
  diskLimit: '10g',   // 10GB disk
  timeout: 3600000    // 1 hour max
})
```

### 3.3 Filesystem Security

```javascript
// Make critical paths read-only
await sandbox.commands.run('chmod 444 /etc/secrets/*')
await sandbox.commands.run('chmod 555 /app/bin/*')

// Restrict /tmp to user only
await sandbox.commands.run('chmod 700 /tmp')
```

### 3.4 Process Isolation

```javascript
// Run processes as non-root
await sandbox.commands.run('useradd -m appuser')

await sandbox.commands.run(
  'su - appuser -c "docker run --user 1000:1000 gladia-mcp-server"'
)
```

---

## 4. Docker Container Security

### 4.1 Non-Root User

```dockerfile
# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root
USER appuser
```

### 4.2 Read-Only Filesystem

```yaml
# docker-compose.yml
services:
  gladia-mcp:
    read_only: true
    tmpfs:
      - /tmp:mode=1777
      - /app/tmp:mode=700
```

### 4.3 Capability Dropping

```yaml
services:
  gladia-mcp:
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if needed
```

### 4.4 Security Scanning

```bash
# Scan images
docker scan gladia-mcp-server:latest

# Or use Trivy
trivy image --severity HIGH,CRITICAL gladia-mcp-server:latest
```

---

## 5. Input Validation and Sanitization

### 5.1 User Input Validation

```javascript
import { z } from 'zod'

const QueryRequestSchema = z.object({
  input: z.string()
    .min(1, 'Input cannot be empty')
    .max(5000, 'Input too long (max 5000 characters)')
    .refine(
      input => !/<script>|eval\(|exec\(/i.test(input),
      'Suspicious input detected'
    ),

  session_id: z.string().uuid().optional(),

  mode: z.enum(['text', 'audio']).default('text')
})

// Validate request
try {
  const validated = QueryRequestSchema.parse(request.body)
  // Use validated data
} catch (error) {
  return { error: 'Invalid input', details: error.errors }
}
```

### 5.2 URL Validation

```javascript
function validateAPIURL(url) {
  try {
    const parsed = new URL(url)

    // Block private IPs
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)) {
      throw new Error('Cannot call localhost')
    }

    if (parsed.hostname.match(/^(10|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\./)) {
      throw new Error('Cannot call private IP ranges')
    }

    // Only HTTPS in production
    if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      throw new Error('Only HTTPS URLs allowed')
    }

    return true

  } catch (error) {
    throw new Error(`Invalid URL: ${error.message}`)
  }
}
```

### 5.3 Command Injection Prevention

```javascript
import { spawn } from 'child_process'

// BAD: Command injection vulnerable
// const result = await exec(`curl ${userProvidedURL}`)

// GOOD: Use parameterized execution
function safeCurl(url) {
  validateAPIURL(url)

  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-X', 'GET', url])

    let stdout = ''
    let stderr = ''

    curl.stdout.on('data', data => stdout += data)
    curl.stderr.on('data', data => stderr += data)

    curl.on('close', code => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(stderr))
      }
    })
  })
}
```

---

## 6. Log Scrubbing and Data Privacy

### 6.1 Sensitive Data Patterns

```javascript
const SENSITIVE_PATTERNS = {
  api_key: /([a-z]+_)?api[_-]?key["\s:=]+([a-zA-Z0-9_-]{20,})/gi,
  bearer_token: /bearer\s+([a-zA-Z0-9._-]+)/gi,
  password: /(password|passwd|pwd)["\s:=]+([^\s,}]+)/gi,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  credit_card: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g
}

function scrubSensitiveData(text) {
  let scrubbed = text

  for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    scrubbed = scrubbed.replace(pattern, `[REDACTED_${type.toUpperCase()}]`)
  }

  return scrubbed
}
```

### 6.2 Logging with Auto-Scrubbing

```javascript
class SecureLogger {
  constructor(honeyhiveClient) {
    this.honeyhive = honeyhiveClient
  }

  async log(level, message, metadata = {}) {
    // Scrub sensitive data
    const scrubbedMessage = scrubSensitiveData(message)
    const scrubbedMetadata = this.scrubObject(metadata)

    // Log to HoneyHive
    await this.honeyhive.logEvent({
      event_name: level,
      level,
      metadata: {
        message: scrubbedMessage,
        ...scrubbedMetadata
      }
    })

    // Console log (also scrubbed)
    console.log(`[${level}]`, scrubbedMessage)
  }

  scrubObject(obj) {
    const scrubbed = {}

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        scrubbed[key] = scrubSensitiveData(value)
      } else if (typeof value === 'object') {
        scrubbed[key] = this.scrubObject(value)
      } else {
        scrubbed[key] = value
      }
    }

    return scrubbed
  }
}

// Usage
const logger = new SecureLogger(honeyhiveClient)
await logger.log('info', 'API call made', { url: apiUrl, headers })
```

---

## 7. Role-Based Access Control (RBAC)

### 7.1 User Roles

```javascript
const UserRole = {
  ADMIN: 'admin',
  DEVELOPER: 'developer',
  VIEWER: 'viewer'
}

const Permission = {
  CREATE_SESSION: 'create_session',
  VIEW_LOGS: 'view_logs',
  RUN_SECURITY_SCAN: 'run_security_scan',
  MANAGE_USERS: 'manage_users'
}

const ROLE_PERMISSIONS = {
  [UserRole.ADMIN]: [
    Permission.CREATE_SESSION,
    Permission.VIEW_LOGS,
    Permission.RUN_SECURITY_SCAN,
    Permission.MANAGE_USERS
  ],
  [UserRole.DEVELOPER]: [
    Permission.CREATE_SESSION,
    Permission.VIEW_LOGS,
    Permission.RUN_SECURITY_SCAN
  ],
  [UserRole.VIEWER]: [
    Permission.VIEW_LOGS
  ]
}
```

### 7.2 Permission Checking

```javascript
function checkPermission(userRole, requiredPermission) {
  const permissions = ROLE_PERMISSIONS[userRole] || []
  return permissions.includes(requiredPermission)
}

// Middleware
async function requirePermission(permission) {
  return async (req, res, next) => {
    const user = req.user  // From authentication middleware

    if (!checkPermission(user.role, permission)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    next()
  }
}

// Usage in routes
app.post('/query',
  requirePermission(Permission.CREATE_SESSION),
  async (req, res) => {
    // Handle query
  }
)
```

### 7.3 Horizon3.ai RBAC Integration

```javascript
async function validatePermissionWithHorizon3(userId, resource, action) {
  const result = await horizon3Mcp.callTool('validate_permissions', {
    userId,
    resource,
    action
  })

  if (!result.allowed) {
    throw new Error(`Permission denied: ${result.reason}`)
  }

  return true
}

// Use in workflows
await validatePermissionWithHorizon3(userId, 'api/users', 'write')
```

---

## 8. Rate Limiting and Abuse Prevention

### 8.1 Rate Limiting (Express)

```javascript
import rateLimit from 'express-rate-limit'

const queryLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,  // 10 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
})

app.post('/query', queryLimiter, async (req, res) => {
  // Handle query
})
```

### 8.2 Cost Limits

```javascript
async function checkCostLimits(userId) {
  const usage = await getMonthlyUsage(userId)

  const limits = {
    gladia_transcriptions: 1000,
    api_calls: 10000,
    total_cost_usd: 100
  }

  if (usage.gladia_transcriptions >= limits.gladia_transcriptions) {
    throw new Error('Monthly transcription limit exceeded')
  }

  if (usage.total_cost_usd >= limits.total_cost_usd) {
    throw new Error('Monthly cost limit exceeded')
  }

  return true
}
```

### 8.3 Timeout Enforcement

```javascript
async function executeWithTimeout(promise, timeoutMs = 60000) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
  )

  return Promise.race([promise, timeout])
}

// Usage
const result = await executeWithTimeout(
  agent.process(userInput),
  120000  // 2 minutes
)
```

---

## 9. Secure Communication

### 9.1 HTTPS Only

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.protocol !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.get('host')}${req.url}`)
  }
  next()
})
```

### 9.2 CORS Configuration

```javascript
import cors from 'cors'

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:7860'],
  methods: ['GET', 'POST'],
  credentials: true,
  maxAge: 86400  // 24 hours
}))
```

### 9.3 Security Headers

```javascript
import helmet from 'helmet'

app.use(helmet())
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}))
```

---

## 10. Security Testing and Monitoring

### 10.1 Horizon3.ai Security Scans

```javascript
// Run security scan before deployment
async function runPreDeploymentScan() {
  const scan = await horizon3Mcp.callTool('run_security_scan', {
    target: process.env.DEPLOYMENT_URL,
    scanType: 'full'
  })

  // Wait for completion
  while (true) {
    const result = await horizon3Mcp.callTool('get_scan_results', {
      scanId: scan.scan_id
    })

    if (result.status === 'completed') {
      if (result.vulnerabilities.length > 0) {
        throw new Error(`Security scan found ${result.vulnerabilities.length} vulnerabilities`)
      }
      break
    }

    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  console.log('✓ Security scan passed')
}
```

### 10.2 Security Monitoring

```javascript
// Monitor for security events
const SECURITY_EVENTS = [
  'failed_authentication',
  'permission_denied',
  'rate_limit_exceeded',
  'suspicious_input',
  'secret_accessed'
]

async function monitorSecurityEvents() {
  for (const eventType of SECURITY_EVENTS) {
    const count = await honeyhive.getEventCount(eventType, { timeWindow: '1h' })

    if (count > THRESHOLDS[eventType]) {
      await alertSecurityTeam({
        event: eventType,
        count,
        severity: 'HIGH'
      })
    }
  }
}

// Run every 5 minutes
setInterval(monitorSecurityEvents, 300000)
```

---

## Conclusion

This security guide provides:

- ✅ Threat model and defense-in-depth strategy
- ✅ Comprehensive secrets management
- ✅ E2B and Docker isolation
- ✅ Input validation and sanitization
- ✅ Log scrubbing for data privacy
- ✅ RBAC implementation
- ✅ Rate limiting and abuse prevention
- ✅ Secure communication protocols
- ✅ Security testing and monitoring

**Security Checklist**:
- [ ] All secrets in .env (not committed)
- [ ] Input validation on all endpoints
- [ ] Logs scrubbed of sensitive data
- [ ] HTTPS only in production
- [ ] Rate limiting enabled
- [ ] RBAC enforced
- [ ] Security scans passing
- [ ] Monitoring and alerts configured

**Next Steps**:
1. Implement all security measures
2. Run security scans with Horizon3.ai
3. Test input validation thoroughly
4. Monitor security events in production
5. Proceed to DEVELOPMENT_WORKFLOW.md

**Key Takeaways**:
- Security is multi-layered
- Never trust user input
- Secrets never in code or logs
- Isolate everything (E2B, Docker)
- Monitor and alert on security events
