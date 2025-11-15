# Phase 7: Testing & Documentation

**Duration**: 6-8 hours
**Priority**: High
**Risk Level**: Medium
**Prerequisites**: Phases 1-6 complete (all features implemented)

## Overview

Write comprehensive tests and finalize documentation to ensure quality and maintainability.

## Objectives

1. Write unit tests for critical components
2. Create integration tests for MCP tools
3. Write E2E test for full voice-to-API workflow
4. Update README with complete instructions
5. Create demo script and practice

## Key Deliverables

### Unit Tests

**Workflow Planner Test** (`agent/tests/planner.test.js`)

```javascript
import { describe, it, expect } from 'vitest'
import { WorkflowPlanner } from '../src/workflow/planner.js'

describe('WorkflowPlanner', () => {
  it('should generate workflow for API testing', async () => {
    const planner = new WorkflowPlanner(mockLLM)
    const workflow = await planner.plan('Test GET https://api.example.com/users')

    expect(workflow.steps).toHaveLength(2)
    expect(workflow.steps[0].tool).toBe('call_api')
    expect(workflow.steps[1].tool).toBe('create_trace')
  })

  it('should handle voice input workflow', async () => {
    const workflow = await planner.plan('audio:test.mp3')

    expect(workflow.steps[0].tool).toBe('transcribe_audio')
    expect(workflow.steps[1].tool).toBe('call_api')
  })
})
```

**MCP Tools Test** (`mcp-servers/gladia/tests/tools.test.js`)

```javascript
import { describe, it, expect, vi } from 'vitest'
import { transcribeAudio } from '../src/tools.js'

describe('Gladia Tools', () => {
  it('should transcribe audio successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transcription: 'Hello world', language: 'en' })
    })

    const result = await transcribeAudio({
      audioUrl: 'https://example.com/test.mp3'
    })

    expect(result.success).toBe(true)
    expect(result.transcription).toBe('Hello world')
  })
})
```

### Integration Tests

**MCP Integration Test** (`tests/integration/mcp.test.js`)

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'child_process'

describe('MCP Integration', () => {
  let mcpProcess

  beforeAll(async () => {
    mcpProcess = spawn('node', ['mcp-servers/gladia/src/index.js'])
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  afterAll(() => {
    mcpProcess.kill()
  })

  it('should connect to MCP server', async () => {
    const response = await fetch('http://localhost:8000/health')
    expect(response.ok).toBe(true)
  })

  it('should list available tools', async () => {
    const response = await fetch('http://localhost:8000/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list'
      })
    })

    const data = await response.json()
    expect(data.result.tools).toContainEqual(
      expect.objectContaining({ name: 'transcribe_audio' })
    )
  })
})
```

### E2E Test

**Full Workflow Test** (`tests/e2e/voice-to-api.test.js`)

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { StepwiseAgent } from '../../agent/src/agent.js'
import fs from 'fs'

describe('Voice to API E2E', () => {
  let agent

  beforeAll(async () => {
    agent = new StepwiseAgent({
      e2b: { templateId: process.env.E2B_TEMPLATE_ID },
      llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
    })
    await agent.initialize()
  }, 180000)

  afterAll(async () => {
    await agent.cleanup()
  })

  it('should process voice command end-to-end', async () => {
    const audioBuffer = fs.readFileSync('tests/fixtures/test-command.mp3')

    const result = await agent.processVoiceInput(audioBuffer, 'test-session')

    expect(result.workflow.steps).toHaveLength(4)
    expect(result.workflow.steps[0].tool).toBe('transcribe_audio')
    expect(result.workflow.steps[0].status).toBe('completed')

    const apiStep = result.workflow.steps.find(s => s.tool === 'call_api')
    expect(apiStep.status).toBe('completed')
    expect(apiStep.result.success).toBe(true)
  }, 240000)
})
```

### Run Tests

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/ui

# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run E2E tests (requires E2B)
npm run test:e2e

# Generate coverage report
npm test -- --coverage
```

### Update README

Add to root `README.md`:

```markdown
## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### E2E Tests (requires E2B credits)
```bash
npm run test:e2e
```

### Coverage
```bash
npm test -- --coverage
open coverage/index.html
```

## Demo

See [Demo Script](phases/PHASE_8.md#demo-script) for 3-minute demonstration flow.

Example workflow:
1. User: "Test the JSONPlaceholder API by getting user 1"
2. Agent plans 3 steps: create trace, call API, log result
3. All steps execute successfully
4. Results displayed with HoneyHive trace link

## Troubleshooting

**E2B Sandbox Timeout**
- Increase timeout in `.env`: `E2B_TIMEOUT=600000`
- Use local Docker mode: `USE_E2B=false`

**MCP Tool Not Found**
- Check server is running: `docker-compose ps`
- Verify health: `curl http://localhost:8000/health`

**API Rate Limit**
- Use backup API keys
- Reduce test frequency
- Check quota: `curl https://api.openai.com/v1/usage`
```

## Success Criteria

- [ ] Unit tests pass with >70% coverage
- [ ] Integration tests pass consistently
- [ ] E2E test completes successfully
- [ ] README updated with quickstart
- [ ] Demo script written and practiced
- [ ] Video recording of demo created

## Next Steps

**[Phase 8: Deployment & Demo Prep](./PHASE_8.md)**
