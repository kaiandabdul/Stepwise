# Phase 4: Agent Core Logic & Workflow Orchestration

**Duration**: 10-14 hours
**Priority**: Critical
**Risk Level**: High
**Prerequisites**: Phase 3 complete (E2B + Docker integration working)

## Overview

Phase 4 implements the intelligent agent that orchestrates workflows across MCP servers. This is the brain of Stepwise - it receives user input, plans multi-step workflows using LLMs, executes steps via MCP tools, and synthesizes responses.

This phase has high complexity because it involves LLM integration, workflow dependency resolution, parallel execution, error handling, and state management.

## Objectives

1. Implement agent application with HTTP API
2. Integrate LLM (OpenAI GPT-4 or Anthropic Claude) for workflow planning
3. Build workflow execution engine (sequential + parallel)
4. Create MCP client for tool communication
5. Implement session management
6. Add comprehensive error handling and logging

## Key Deliverables

### Agent Application (`agent/src/`)
- `index.js` - Main entry point, Express/FastAPI server
- `agent.js` - StepwiseAgent class
- `config.js` - Configuration management

### LLM Integration (`agent/src/llm/`)
- `client.js` - LLM API client (OpenAI/Anthropic)
- `prompts.js` - System prompts for workflow planning

### Workflow Engine (`agent/src/workflow/`)
- `planner.js` - Workflow planning with LLM
- `executor.js` - Execution engine
- `state.js` - Workflow state management

### MCP Client (`agent/src/mcp/`)
- `client.js` - MCP JSON-RPC client
- `tools.js` - Tool discovery and registry

### API Layer (`agent/src/api/`)
- `routes.js` - HTTP endpoints
- `middleware.js` - Request validation

## Success Criteria

- [ ] Agent starts and listens on port 3000
- [ ] Can process text input: "Test GET https://jsonplaceholder.typicode.com/users/1"
- [ ] LLM generates correct workflow plan
- [ ] Workflow executor calls MCP tools in correct order
- [ ] Results returned in structured format
- [ ] HoneyHive trace created for every workflow
- [ ] Voice input (audio → transcribe → execute) works end-to-end
- [ ] Error handling gracefully handles tool failures
- [ ] Session state persists across requests

## Implementation (Abbreviated - see docs/WORKFLOW_ORCHESTRATION.md for details)

### Core Agent Class (`agent/src/agent.js`)

```javascript
import { SandboxManager } from './e2b/sandbox-manager.js'
import { LLMClient } from './llm/client.js'
import { WorkflowPlanner } from './workflow/planner.js'
import { WorkflowExecutor } from './workflow/executor.js'
import { SessionManager } from './session/manager.js'

export class StepwiseAgent {
  constructor(config) {
    this.sandboxManager = new SandboxManager(config.e2b)
    this.llmClient = new LLMClient(config.llm)
    this.planner = new WorkflowPlanner(this.llmClient)
    this.executor = new WorkflowExecutor(this.sandboxManager)
    this.sessions = new SessionManager()
  }

  async initialize() {
    await this.sandboxManager.initialize()
  }

  async processTextInput(text, sessionId) {
    const session = await this.sessions.getOrCreate(sessionId)

    // Step 1: Plan workflow
    const workflow = await this.planner.plan(text, session)

    // Step 2: Execute workflow
    const result = await this.executor.execute(workflow)

    // Step 3: Synthesize response
    const response = await this.synthesize(result)

    return { workflow, result, response }
  }

  async processVoiceInput(audioBuffer, sessionId) {
    // Step 1: Transcribe audio
    const transcription = await this.sandboxManager.callTool(8000, 'transcribe_audio', {
      audioUrl: audioBuffer  // Handle upload
    })

    // Step 2: Process as text
    return this.processTextInput(transcription.transcription, sessionId)
  }
}
```

### Workflow Planner (`agent/src/workflow/planner.js`)

```javascript
export class WorkflowPlanner {
  constructor(llmClient) {
    this.llm = llmClient
  }

  async plan(userInput, session) {
    const prompt = this.buildPlanningPrompt(userInput, session)
    const response = await this.llm.chat(prompt)
    const workflow = this.parseWorkflow(response)
    return workflow
  }

  buildPlanningPrompt(userInput, session) {
    return [
      {
        role: 'system',
        content: `You are a workflow planning assistant. Generate a step-by-step plan to fulfill the user's request.

Available Tools:
- transcribe_audio(audioUrl, language) - Gladia
- create_trace(trace_name, session_id) - HoneyHive
- log_event(event_name, trace_id, metadata) - HoneyHive
- call_api(method, url, headers, body) - Custom API
- run_security_scan(target, scanType) - Horizon3

Output JSON format:
{
  "steps": [
    {
      "id": "step-1",
      "tool": "tool_name",
      "parameters": {...},
      "dependencies": []
    }
  ]
}`
      },
      {
        role: 'user',
        content: userInput
      }
    ]
  }

  parseWorkflow(llmResponse) {
    const parsed = JSON.parse(llmResponse.content)
    return {
      steps: parsed.steps,
      createdAt: new Date().toISOString()
    }
  }
}
```

### Workflow Executor (`agent/src/workflow/executor.js`)

```javascript
export class WorkflowExecutor {
  constructor(sandboxManager) {
    this.sandbox = sandboxManager
  }

  async execute(workflow) {
    // Group steps by dependency level
    const levels = this.groupByDependencyLevel(workflow.steps)

    for (const levelSteps of levels) {
      // Execute steps in parallel within each level
      await Promise.all(levelSteps.map(step => this.executeStep(step, workflow)))
    }

    return workflow
  }

  async executeStep(step, workflow) {
    const port = this.getToolPort(step.tool)
    const result = await this.sandbox.callTool(port, step.tool, step.parameters)
    step.result = result
    step.status = result.success ? 'completed' : 'failed'
    return result
  }

  getToolPort(toolName) {
    const mapping = {
      'transcribe_audio': 8000,
      'get_supported_languages': 8000,
      'create_trace': 8001,
      'log_event': 8001,
      'log_metric': 8001,
      'end_trace': 8001,
      'run_security_scan': 8002,
      'get_scan_results': 8002,
      'validate_permissions': 8002,
      'call_api': 8003
    }
    return mapping[toolName]
  }
}
```

### HTTP API (`agent/src/index.js`)

```javascript
import express from 'express'
import { StepwiseAgent } from './agent.js'

const app = express()
app.use(express.json())

const agent = new StepwiseAgent({
  e2b: { templateId: process.env.E2B_TEMPLATE_ID },
  llm: { provider: 'openai', apiKey: process.env.OPENAI_API_KEY }
})

await agent.initialize()

app.post('/query', async (req, res) => {
  const { input, session_id } = req.body
  const result = await agent.processTextInput(input, session_id)
  res.json(result)
})

app.post('/query/audio', async (req, res) => {
  const { audio, session_id } = req.body
  const result = await agent.processVoiceInput(audio, session_id)
  res.json(result)
})

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', agent: 'stepwise' })
})

app.listen(3000, () => console.log('Agent listening on port 3000'))
```

## Testing

```bash
cd agent
npm start

# Test text query
curl -X POST http://localhost:3000/query \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Test the JSONPlaceholder API by getting user 1",
    "session_id": "test-123"
  }'
```

## Common Pitfalls

1. **LLM hallucinations**: Validate workflow before execution
2. **Circular dependencies**: Check for cycles in workflow graph
3. **Timeout errors**: Increase timeout for long-running workflows
4. **Memory leaks**: Properly cleanup sessions
5. **Race conditions**: Use proper locking for parallel execution

## Next Steps

**[Phase 5: Frontend Development](./PHASE_5.md)**
