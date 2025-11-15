# WORKFLOW_ORCHESTRATION.md

## Multi-Step Agent Logic & Tool Chaining

### Table of Contents
1. [Workflow Orchestration Overview](#workflow-orchestration-overview)
2. [Agent Architecture](#agent-architecture)
3. [Workflow Planning with LLM](#workflow-planning-with-llm)
4. [Workflow Execution Engine](#workflow-execution-engine)
5. [Tool Chaining Patterns](#tool-chaining-patterns)
6. [Error Handling and Recovery](#error-handling-and-recovery)
7. [Context Management](#context-management)
8. [Observability and Tracing](#observability-and-tracing)
9. [LLM-Powered Workflow Optimization](#llm-powered-workflow-optimization)
10. [Advanced Workflow Patterns](#advanced-workflow-patterns)

---

## 1. Workflow Orchestration Overview

### What is Workflow Orchestration?

**Workflow orchestration** is the process of coordinating multiple tools (MCP servers) in a sequence or parallel to accomplish a complex task. The agent acts as the conductor, deciding which tools to use, in what order, and how to handle results.

**Key Challenges**:
- **Planning**: Determining the right sequence of steps
- **Dependencies**: Managing step dependencies
- **Error Handling**: Recovering from failures
- **Context Passing**: Sharing data between steps
- **Parallel Execution**: Running independent steps concurrently

### Example Workflow

```
User: "Debug my authentication API and run a security scan"

Workflow:
1. Parse user intent (LLM)
2. Call API endpoint (Custom API MCP)
3. Log API call (HoneyHive MCP) [parallel with 4]
4. Run security scan (Horizon3.ai MCP) [parallel with 3]
5. Analyze results (LLM)
6. Generate documentation (LLM)
7. Return to user
```

---

## 2. Agent Architecture

### 2.1 Core Agent Components

```javascript
// agent/src/Agent.js
import { OpenAI } from 'openai'
import { MCPClient } from './mcp/client.js'
import { WorkflowPlanner } from './workflow/planner.js'
import { WorkflowExecutor } from './workflow/executor.js'
import { SessionManager } from './session/manager.js'

// AI Gateway Model Selection:
// - fast: anthropic/claude-haiku-4.5 (quick tasks)
// - balanced: anthropic/claude-sonnet-4.5 (default, most tasks)
// - instant: openai/gpt-5.1-instant (real-time responses)
// - code: openai/gpt-5.1-codex (code generation)
// - reasoning: openai/gpt-5.1-thinking (complex analysis)

class StepwiseAgent {
  constructor(config) {
    this.llm = new OpenAI({
      apiKey: config.aiGatewayApiKey,
      baseURL: config.aiGatewayBaseURL || 'https://ai-gateway.vercel.sh/v1'
    })
    this.mcpClient = new MCPClient()
    this.planner = new WorkflowPlanner(this.llm)
    this.executor = new WorkflowExecutor(this.mcpClient)
    this.sessions = new SessionManager()
  }

  async process(userInput, sessionId) {
    // 1. Get or create session
    const session = await this.sessions.getOrCreate(sessionId)

    // 2. Parse user intent
    const intent = await this.parseIntent(userInput, session)

    // 3. Plan workflow
    const workflow = await this.planner.plan(intent, session)

    // 4. Execute workflow
    const result = await this.executor.execute(workflow, session)

    // 5. Synthesize response
    const response = await this.synthesize(result, session)

    // 6. Update session
    await this.sessions.update(sessionId, { workflow, result })

    return response
  }

  async parseIntent(userInput, session) {
    const prompt = `
You are an API debugging assistant. Parse the user's intent.

User input: "${userInput}"

Session context: ${JSON.stringify(session.context, null, 2)}

Extract:
1. goal: What the user wants to accomplish
2. target: API endpoint or resource (if mentioned)
3. tools_needed: Which MCP tools might be needed

Respond in JSON format.
`

    // Use fast model for quick intent parsing
    const response = await this.llm.chat.completions.create({
      model: 'anthropic/claude-haiku-4.5',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })

    return JSON.parse(response.choices[0].message.content)
  }

  async synthesize(workflowResult, session) {
    const prompt = `
Synthesize the workflow results into a user-friendly response.

Workflow results: ${JSON.stringify(workflowResult, null, 2)}

Provide:
1. Summary of what was done
2. Key findings
3. Recommendations (if any)

Be concise and helpful.
`

    // Use balanced model for response synthesis
    const response = await this.llm.chat.completions.create({
      model: 'anthropic/claude-sonnet-4.5',
      messages: [{ role: 'user', content: prompt }]
    })

    return response.choices[0].message.content
  }
}

export default StepwiseAgent
```

### 2.2 Workflow State Management

```javascript
// agent/src/workflow/State.js
class WorkflowState {
  constructor(sessionId) {
    this.sessionId = sessionId
    this.workflowId = generateId()
    this.steps = []
    this.context = {}
    this.status = 'pending'
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  addStep(name, tool, parameters, dependencies = []) {
    this.steps.push({
      id: generateId(),
      name,
      tool,
      parameters,
      dependencies,
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null
    })
  }

  updateStep(stepId, updates) {
    const step = this.steps.find(s => s.id === stepId)
    if (!step) throw new Error(`Step ${stepId} not found`)

    Object.assign(step, updates, { updatedAt: new Date() })
    this.updatedAt = new Date()
  }

  getStep(stepId) {
    return this.steps.find(s => s.id === stepId)
  }

  getStepsByStatus(status) {
    return this.steps.filter(s => s.status === status)
  }

  setContext(key, value) {
    this.context[key] = value
    this.updatedAt = new Date()
  }

  getContext(key) {
    return this.context[key]
  }

  toJSON() {
    return {
      sessionId: this.sessionId,
      workflowId: this.workflowId,
      steps: this.steps,
      context: this.context,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }
}

export default WorkflowState
```

---

## 3. Workflow Planning with LLM

### 3.1 Intent Parsing

```javascript
// agent/src/workflow/Planner.js
class WorkflowPlanner {
  constructor(llm) {
    this.llm = llm
  }

  async plan(intent, session) {
    const availableTools = await this.getAvailableTools()

    const prompt = `
You are a workflow planner for an API debugging agent.

User goal: ${intent.goal}
Target: ${intent.target || 'Not specified'}
Available tools: ${JSON.stringify(availableTools, null, 2)}
Session context: ${JSON.stringify(session.context, null, 2)}

Create a step-by-step workflow to accomplish the goal.

For each step, specify:
- name: Descriptive name
- tool: Which MCP tool to use
- parameters: Required parameters (use {{variable}} for values from previous steps)
- dependencies: Array of step names that must complete first
- optional: Boolean indicating if step can be skipped on failure

Return JSON array of steps.
`

    // Use balanced model for workflow planning
    const response = await this.llm.chat.completions.create({
      model: 'anthropic/claude-sonnet-4.5',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })

    const plan = JSON.parse(response.choices[0].message.content)

    // Create workflow state
    const workflow = new WorkflowState(session.id)
    for (const step of plan.steps) {
      workflow.addStep(
        step.name,
        step.tool,
        step.parameters,
        step.dependencies || []
      )
      if (step.optional) {
        workflow.getStep(workflow.steps[workflow.steps.length - 1].id).optional = true
      }
    }

    return workflow
  }

  async getAvailableTools() {
    // In real implementation, query MCP servers
    return [
      {
        name: 'transcribe_audio',
        server: 'gladia',
        description: 'Transcribe audio to text'
      },
      {
        name: 'call_api',
        server: 'custom-api',
        description: 'Make HTTP API request'
      },
      {
        name: 'create_trace',
        server: 'honeyhive',
        description: 'Create observability trace'
      },
      {
        name: 'log_event',
        server: 'honeyhive',
        description: 'Log an event'
      },
      {
        name: 'run_security_scan',
        server: 'horizon3',
        description: 'Run security scan on API'
      }
    ]
  }
}

export default WorkflowPlanner
```

### 3.2 Example Workflow Plans

**Voice-to-API Workflow**:
```json
{
  "steps": [
    {
      "name": "transcribe_user_input",
      "tool": "transcribe_audio",
      "parameters": {
        "audioUrl": "{{context.audioFile}}",
        "language": "en"
      },
      "dependencies": []
    },
    {
      "name": "extract_api_details",
      "tool": "llm_parse",
      "parameters": {
        "text": "{{transcribe_user_input.transcription}}",
        "task": "extract API method and URL"
      },
      "dependencies": ["transcribe_user_input"]
    },
    {
      "name": "call_target_api",
      "tool": "call_api",
      "parameters": {
        "method": "{{extract_api_details.method}}",
        "url": "{{extract_api_details.url}}"
      },
      "dependencies": ["extract_api_details"]
    },
    {
      "name": "log_api_call",
      "tool": "log_event",
      "parameters": {
        "event_name": "api_call",
        "metadata": {
          "method": "{{extract_api_details.method}}",
          "url": "{{extract_api_details.url}}",
          "status": "{{call_target_api.status}}"
        }
      },
      "dependencies": ["call_target_api"],
      "optional": true
    }
  ]
}
```

**API Debug with Security Scan**:
```json
{
  "steps": [
    {
      "name": "test_api_endpoint",
      "tool": "call_api",
      "parameters": {
        "method": "POST",
        "url": "https://api.example.com/auth/login",
        "body": {"username": "test", "password": "test"}
      },
      "dependencies": []
    },
    {
      "name": "log_api_result",
      "tool": "log_event",
      "parameters": {
        "event_name": "api_test",
        "metadata": {"result": "{{test_api_endpoint.body}}"}
      },
      "dependencies": ["test_api_endpoint"],
      "optional": true
    },
    {
      "name": "run_security_scan",
      "tool": "run_security_scan",
      "parameters": {
        "target": "https://api.example.com",
        "scanType": "full"
      },
      "dependencies": []
    },
    {
      "name": "get_scan_results",
      "tool": "get_scan_results",
      "parameters": {
        "scanId": "{{run_security_scan.scan_id}}"
      },
      "dependencies": ["run_security_scan"]
    }
  ]
}
```

---

## 4. Workflow Execution Engine

### 4.1 Sequential Execution

```javascript
// agent/src/workflow/Executor.js
class WorkflowExecutor {
  constructor(mcpClient) {
    this.mcpClient = mcpClient
  }

  async execute(workflow, session) {
    console.log(`Executing workflow ${workflow.workflowId}`)

    workflow.status = 'running'

    for (const step of workflow.steps) {
      try {
        // Check dependencies
        if (!this.checkDependencies(step, workflow)) {
          workflow.updateStep(step.id, {
            status: 'skipped',
            error: 'Dependencies not met'
          })
          continue
        }

        // Execute step
        workflow.updateStep(step.id, {
          status: 'running',
          startedAt: new Date()
        })

        const result = await this.executeStep(step, workflow)

        workflow.updateStep(step.id, {
          status: 'completed',
          result,
          completedAt: new Date()
        })

      } catch (error) {
        console.error(`Step ${step.name} failed:`, error)

        workflow.updateStep(step.id, {
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        })

        // Handle error
        await this.handleStepError(step, error, workflow)

        // If critical step failed, abort
        if (!step.optional) {
          workflow.status = 'failed'
          break
        }
      }
    }

    if (workflow.status !== 'failed') {
      workflow.status = 'completed'
    }

    return workflow
  }

  checkDependencies(step, workflow) {
    if (!step.dependencies || step.dependencies.length === 0) {
      return true
    }

    for (const depName of step.dependencies) {
      const depStep = workflow.steps.find(s => s.name === depName)
      if (!depStep || depStep.status !== 'completed') {
        return false
      }
    }

    return true
  }

  async executeStep(step, workflow) {
    // Resolve parameter placeholders
    const resolvedParams = this.resolveParameters(step.parameters, workflow)

    // Call MCP tool
    const result = await this.mcpClient.callTool(step.tool, resolvedParams)

    return result
  }

  resolveParameters(parameters, workflow) {
    const resolved = {}

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Extract reference: {{step_name.field}}
        const ref = value.slice(2, -2)
        const [stepName, field] = ref.split('.')

        if (stepName === 'context') {
          resolved[key] = workflow.getContext(field)
        } else {
          const refStep = workflow.steps.find(s => s.name === stepName)
          if (refStep && refStep.result) {
            resolved[key] = field ? refStep.result[field] : refStep.result
          }
        }
      } else {
        resolved[key] = value
      }
    }

    return resolved
  }

  async handleStepError(step, error, workflow) {
    // Log error to HoneyHive
    try {
      await this.mcpClient.callTool('log_event', {
        event_name: 'step_error',
        level: 'error',
        metadata: {
          step: step.name,
          error: error.message
        }
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }
}

export default WorkflowExecutor
```

### 4.2 Parallel Execution

```javascript
async executeParallel(workflow, session) {
  // Group steps by dependency level
  const levels = this.groupByDependencyLevel(workflow.steps)

  for (const levelSteps of levels) {
    // Execute all steps at this level in parallel
    const promises = levelSteps.map(step => this.executeStepSafe(step, workflow))

    await Promise.allSettled(promises)
  }

  workflow.status = workflow.steps.some(s => s.status === 'failed') ? 'failed' : 'completed'

  return workflow
}

groupByDependencyLevel(steps) {
  const levels = []
  const processed = new Set()

  while (processed.size < steps.length) {
    const level = []

    for (const step of steps) {
      if (processed.has(step.id)) continue

      // Check if all dependencies are processed
      const depsMet = (step.dependencies || []).every(depName => {
        const depStep = steps.find(s => s.name === depName)
        return depStep && processed.has(depStep.id)
      })

      if (depsMet) {
        level.push(step)
        processed.add(step.id)
      }
    }

    if (level.length === 0 && processed.size < steps.length) {
      throw new Error('Circular dependency detected')
    }

    levels.push(level)
  }

  return levels
}

async executeStepSafe(step, workflow) {
  try {
    workflow.updateStep(step.id, {
      status: 'running',
      startedAt: new Date()
    })

    const result = await this.executeStep(step, workflow)

    workflow.updateStep(step.id, {
      status: 'completed',
      result,
      completedAt: new Date()
    })

    return result

  } catch (error) {
    workflow.updateStep(step.id, {
      status: 'failed',
      error: error.message,
      completedAt: new Date()
    })

    throw error
  }
}
```

---

## 5. Tool Chaining Patterns

### 5.1 Audio → Transcription → API Call → Log

```javascript
const workflow = new WorkflowState(sessionId)

// Step 1: Transcribe audio
workflow.addStep('transcribe', 'transcribe_audio', {
  audioUrl: '{{context.audioFile}}',
  language: 'en'
}, [])

// Step 2: Parse transcription to extract API details
workflow.addStep('parse_intent', 'llm_parse', {
  text: '{{transcribe.transcription}}',
  task: 'extract_api_details'
}, ['transcribe'])

// Step 3: Call API
workflow.addStep('call_api', 'call_api', {
  method: '{{parse_intent.method}}',
  url: '{{parse_intent.url}}',
  headers: '{{parse_intent.headers}}',
  body: '{{parse_intent.body}}'
}, ['parse_intent'])

// Step 4: Log result
workflow.addStep('log_result', 'log_event', {
  event_name: 'api_call_completed',
  metadata: {
    status: '{{call_api.status}}',
    duration: '{{call_api.duration_ms}}'
  }
}, ['call_api'])
```

### 5.2 Parallel: API Call + Security Scan + Logging

```javascript
// Step 1: Test API (no dependencies)
workflow.addStep('test_api', 'call_api', {
  method: 'POST',
  url: 'https://api.example.com/users'
}, [])

// Step 2: Security scan (parallel with log)
workflow.addStep('security_scan', 'run_security_scan', {
  target: 'https://api.example.com',
  scanType: 'quick'
}, [])

// Step 3: Log API test (depends on test_api)
workflow.addStep('log_test', 'log_event', {
  event_name: 'api_test',
  metadata: {'result': '{{test_api.body}}'}
}, ['test_api'])

// Execution: test_api and security_scan run in parallel,
// then log_test runs after test_api completes
```

### 5.3 Conditional Branching

```javascript
async executeWithBranching(workflow) {
  for (const step of workflow.steps) {
    const result = await this.executeStep(step, workflow)

    // Check condition
    if (step.condition) {
      const conditionMet = this.evaluateCondition(step.condition, result, workflow)

      if (conditionMet && step.if_true) {
        // Execute if_true branch
        for (const branchStep of step.if_true) {
          await this.executeStep(branchStep, workflow)
        }
      } else if (!conditionMet && step.if_false) {
        // Execute if_false branch
        for (const branchStep of step.if_false) {
          await this.executeStep(branchStep, workflow)
        }
      }
    }
  }
}

evaluateCondition(condition, result, workflow) {
  // Example: condition = "{{call_api.status}} === 200"
  // Parse and evaluate condition
  const value = this.resolveParameters({value: condition.value}, workflow).value
  const operator = condition.operator  // '===', '!==', '>', '<', etc.
  const expected = condition.expected

  switch (operator) {
    case '===': return value === expected
    case '!==': return value !== expected
    case '>': return value > expected
    case '<': return value < expected
    case '>=': return value >= expected
    case '<=': return value <= expected
    default: return false
  }
}
```

---

## 6. Error Handling and Recovery

### 6.1 Retry with Exponential Backoff

```javascript
async executeStepWithRetry(step, workflow, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.executeStep(step, workflow)
      return result

    } catch (error) {
      console.error(`Step ${step.name} failed (attempt ${attempt}/${maxRetries}):`, error)

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000
        console.log(`Retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))

        // Log retry
        await this.mcpClient.callTool('log_event', {
          event_name: 'step_retry',
          metadata: {
            step: step.name,
            attempt,
            error: error.message
          }
        })
      } else {
        // All retries exhausted
        throw error
      }
    }
  }
}
```

### 6.2 Graceful Degradation

```javascript
async handleStepFailure(step, error, workflow) {
  // Option 1: Skip optional step
  if (step.optional) {
    console.log(`Optional step ${step.name} failed, continuing...`)
    return
  }

  // Option 2: Try fallback tool
  if (step.fallback) {
    try {
      console.log(`Trying fallback for ${step.name}...`)
      const result = await this.executeStep(step.fallback, workflow)
      workflow.updateStep(step.id, {
        status: 'completed',
        result,
        note: 'Completed using fallback'
      })
      return
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError)
    }
  }

  // Option 3: Ask LLM for alternative
  const alternative = await this.suggestAlternative(step, error, workflow)
  if (alternative) {
    try {
      const result = await this.executeStep(alternative, workflow)
      return result
    } catch (altError) {
      console.error('Alternative failed:', altError)
    }
  }

  // Option 4: Abort workflow
  throw new Error(`Critical step ${step.name} failed: ${error.message}`)
}

async suggestAlternative(step, error, workflow) {
  const prompt = `
Step "${step.name}" failed with error: ${error.message}

Original parameters: ${JSON.stringify(step.parameters, null, 2)}
Available tools: ${JSON.stringify(await this.getAvailableTools(), null, 2)}

Suggest an alternative approach to accomplish the same goal.
Return JSON with alternative step definition or null if no alternative exists.
`

  // Use balanced model for problem-solving
  const response = await this.llm.chat.completions.create({
    model: 'anthropic/claude-sonnet-4.5',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })

  const suggestion = JSON.parse(response.choices[0].message.content)
  return suggestion.alternative || null
}
```

### 6.3 Partial Success Handling

```javascript
summarizeWorkflowResults(workflow) {
  const successful = workflow.steps.filter(s => s.status === 'completed')
  const failed = workflow.steps.filter(s => s.status === 'failed')
  const skipped = workflow.steps.filter(s => s.status === 'skipped')

  return {
    total_steps: workflow.steps.length,
    successful: successful.length,
    failed: failed.length,
    skipped: skipped.length,
    success_rate: successful.length / workflow.steps.length,
    results: Object.fromEntries(successful.map(s => [s.name, s.result])),
    errors: Object.fromEntries(failed.map(s => [s.name, s.error])),
    duration_ms: this.calculateDuration(workflow)
  }
}

calculateDuration(workflow) {
  const start = Math.min(...workflow.steps.filter(s => s.startedAt).map(s => s.startedAt))
  const end = Math.max(...workflow.steps.filter(s => s.completedAt).map(s => s.completedAt))
  return end - start
}
```

---

## 7. Context Management

### 7.1 Session Context

```javascript
// agent/src/session/Context.js
class SessionContext {
  constructor(sessionId, userId) {
    this.sessionId = sessionId
    this.userId = userId
    this.conversationHistory = []
    this.workflowHistory = []
    this.userPreferences = {}
    this.variables = {}
    this.createdAt = new Date()
    this.updatedAt = new Date()
  }

  addMessage(role, content) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date()
    })
    this.updatedAt = new Date()
  }

  addWorkflow(workflow) {
    this.workflowHistory.push({
      workflowId: workflow.workflowId,
      status: workflow.status,
      summary: this.summarizeWorkflow(workflow),
      timestamp: new Date()
    })
    this.updatedAt = new Date()
  }

  setVariable(key, value) {
    this.variables[key] = value
    this.updatedAt = new Date()
  }

  getVariable(key) {
    return this.variables[key]
  }

  getRelevantContext(currentInput) {
    // Use embeddings or keyword matching to find relevant past workflows
    const relevant = this.workflowHistory.filter(w => {
      // Simple keyword matching (could use embeddings for better results)
      const summary = w.summary.toLowerCase()
      const keywords = currentInput.toLowerCase().split(' ')
      return keywords.some(kw => summary.includes(kw))
    })

    return {
      recent_messages: this.conversationHistory.slice(-5),
      relevant_workflows: relevant.slice(-3),
      variables: this.variables
    }
  }

  summarizeWorkflow(workflow) {
    const tools = workflow.steps.map(s => s.tool).join(', ')
    const status = workflow.status
    return `Used tools: ${tools}. Status: ${status}`
  }
}

export default SessionContext
```

### 7.2 Cross-Workflow Context Sharing

```javascript
async planWithContext(intent, session) {
  // Get relevant past workflows
  const relevant = session.context.getRelevantContext(intent.goal)

  const prompt = `
Create a workflow plan for: ${intent.goal}

Relevant past workflows:
${JSON.stringify(relevant.relevant_workflows, null, 2)}

Learn from past successes:
- Reuse successful patterns
- Avoid errors encountered before
- Leverage cached results if applicable

Plan a new workflow optimized based on past experience.
`

  // Use reasoning model for complex workflow optimization
  const response = await this.llm.chat.completions.create({
    model: 'openai/gpt-5.1-thinking',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })

  return JSON.parse(response.choices[0].message.content)
}
```

---

## 8. Observability and Tracing

### 8.1 HoneyHive Integration

```javascript
async executeWithTracing(workflow, session) {
  // Create trace for entire workflow
  const trace = await this.mcpClient.callTool('create_trace', {
    trace_name: `workflow_${workflow.workflowId}`,
    session_id: session.id,
    metadata: {
      workflow_id: workflow.workflowId,
      total_steps: workflow.steps.length
    }
  })

  const traceId = trace.trace_id

  try {
    for (const step of workflow.steps) {
      // Log step start
      await this.mcpClient.callTool('log_event', {
        event_name: `step_start_${step.name}`,
        trace_id: traceId,
        metadata: {
          step_id: step.id,
          tool: step.tool,
          parameters: step.parameters
        }
      })

      // Execute step
      const startTime = Date.now()
      const result = await this.executeStep(step, workflow)
      const duration = Date.now() - startTime

      // Log metrics
      await this.mcpClient.callTool('log_metric', {
        metric_name: 'step_duration_ms',
        value: duration,
        tags: { step: step.name, tool: step.tool },
        trace_id: traceId
      })

      // Log step completion
      await this.mcpClient.callTool('log_event', {
        event_name: `step_complete_${step.name}`,
        trace_id: traceId,
        metadata: {
          step_id: step.id,
          duration_ms: duration,
          result_summary: this.summarizeResult(result)
        }
      })
    }

    // End trace successfully
    await this.mcpClient.callTool('end_trace', {
      trace_id: traceId,
      status: 'completed',
      metadata: this.summarizeWorkflowResults(workflow)
    })

  } catch (error) {
    // Log error and end trace with failure
    await this.mcpClient.callTool('log_event', {
      event_name: 'workflow_error',
      trace_id: traceId,
      level: 'error',
      metadata: { error: error.message, stack: error.stack }
    })

    await this.mcpClient.callTool('end_trace', {
      trace_id: traceId,
      status: 'failed',
      metadata: { error: error.message }
    })

    throw error
  }

  return workflow
}
```

---

## 9. LLM-Powered Workflow Optimization

### 9.1 Dynamic Workflow Adaptation

```javascript
async adaptWorkflowOnError(workflow, failedStep, error) {
  const prompt = `
Workflow execution failed at step: ${failedStep.name}
Error: ${error.message}

Original workflow:
${JSON.stringify(workflow.steps, null, 2)}

Available tools:
${JSON.stringify(await this.getAvailableTools(), null, 2)}

Suggest modifications to recover from this error. Options:
1. Skip this step and continue with remaining steps
2. Replace failed step with alternative tool
3. Add preparatory steps before the failed step
4. Abort and report to user

Return modified workflow as JSON.
`

  // Use balanced model for adaptive error handling
  const response = await this.llm.chat.completions.create({
    model: 'anthropic/claude-sonnet-4.5',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })

  const modification = JSON.parse(response.choices[0].message.content)

  if (modification.action === 'skip') {
    failedStep.optional = true
    return workflow
  } else if (modification.action === 'replace') {
    failedStep.tool = modification.replacement.tool
    failedStep.parameters = modification.replacement.parameters
    return workflow
  } else if (modification.action === 'add_steps') {
    // Insert new steps before failed step
    const failedIndex = workflow.steps.indexOf(failedStep)
    workflow.steps.splice(failedIndex, 0, ...modification.new_steps)
    return workflow
  } else {
    // Abort
    throw new Error(`Workflow aborted: ${error.message}`)
  }
}
```

---

## 10. Advanced Workflow Patterns

### 10.1 Loop and Iteration

```javascript
async executeLoop(loopStep, workflow, maxIterations = 10) {
  let iteration = 0

  while (iteration < maxIterations) {
    // Execute loop body
    const result = await this.executeStep(loopStep, workflow)

    // Check exit condition
    if (this.evaluateCondition(loopStep.exit_condition, result, workflow)) {
      break
    }

    // Update loop variables
    workflow.setContext('iteration', iteration)
    workflow.setContext('last_result', result)

    iteration++
  }

  if (iteration >= maxIterations) {
    console.warn(`Loop exceeded max iterations (${maxIterations})`)
  }
}
```

### 10.2 Human-in-the-Loop

```javascript
async executeWithApproval(workflow, approvalCallback) {
  for (const step of workflow.steps) {
    // Check if step requires approval
    if (step.require_approval) {
      const approved = await approvalCallback({
        step: step.name,
        tool: step.tool,
        parameters: step.parameters,
        explanation: `About to execute: ${step.name} using ${step.tool}`
      })

      if (!approved) {
        workflow.updateStep(step.id, {
          status: 'skipped',
          note: 'User did not approve'
        })
        continue
      }
    }

    // Execute step
    const result = await this.executeStep(step, workflow)
  }

  return workflow
}
```

### 10.3 Workflow Templates

```javascript
const WORKFLOW_TEMPLATES = {
  api_debug_basic: [
    { name: 'call_api', tool: 'call_api' },
    { name: 'log_result', tool: 'log_event' },
    { name: 'analyze_error', tool: 'llm_analyze' }
  ],

  api_debug_with_security: [
    { name: 'call_api', tool: 'call_api' },
    { name: 'security_scan', tool: 'run_security_scan', dependencies: [] },  // Parallel
    { name: 'log_result', tool: 'log_event', dependencies: ['call_api'] }
  ],

  voice_to_api: [
    { name: 'transcribe', tool: 'transcribe_audio' },
    { name: 'extract_intent', tool: 'llm_extract', dependencies: ['transcribe'] },
    { name: 'call_api', tool: 'call_api', dependencies: ['extract_intent'] }
  ]
}

function applyTemplate(templateName, parameters) {
  const template = WORKFLOW_TEMPLATES[templateName]
  if (!template) {
    throw new Error(`Template ${templateName} not found`)
  }

  const workflow = new WorkflowState()

  for (const stepTemplate of template) {
    workflow.addStep(
      stepTemplate.name,
      stepTemplate.tool,
      parameters[stepTemplate.name] || {},
      stepTemplate.dependencies || []
    )
  }

  return workflow
}

// Usage
const workflow = applyTemplate('api_debug_with_security', {
  call_api: { method: 'GET', url: 'https://api.example.com/users' },
  security_scan: { target: 'https://api.example.com' }
})
```

---

## Conclusion

This workflow orchestration guide provides:

- ✅ Complete agent architecture
- ✅ LLM-powered workflow planning
- ✅ Sequential and parallel execution engines
- ✅ Tool chaining patterns
- ✅ Error handling and recovery strategies
- ✅ Context management across workflows
- ✅ HoneyHive integration for observability
- ✅ LLM-powered optimization
- ✅ Advanced patterns (loops, human-in-the-loop, templates)

**Next Steps**:
1. Implement core agent and workflow classes
2. Integrate with MCP client
3. Test workflow execution with real MCP servers
4. Add HoneyHive tracing throughout
5. Proceed to DOCKER_SETUP.md for containerization

**Key Takeaways**:
- Use LLM for intent parsing and workflow planning
- Support both sequential and parallel execution
- Implement robust error handling and retries
- Trace everything with HoneyHive
- Leverage context for smarter workflows
