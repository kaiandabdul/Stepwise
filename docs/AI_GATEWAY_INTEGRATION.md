# AI Gateway Integration Guide

## Overview

Stepwise uses [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) as a unified interface to access multiple Large Language Model (LLM) providers through a single OpenAI-compatible API. This provides several key benefits:

### Why Vercel AI Gateway?

1. **Unified API**: Access both OpenAI and Anthropic models through a single API endpoint
2. **Simplified Authentication**: One API key instead of managing multiple provider keys
3. **Built-in Observability**: Request logging, usage tracking, and cost management
4. **Automatic Fallbacks**: Configure provider failover for reliability
5. **Cost Optimization**: Track and optimize LLM usage across all providers
6. **OpenAI-Compatible**: Drop-in replacement using existing OpenAI SDK

---

## Configuration

### Environment Variables

Set these in your `.env` file:

```bash
# REQUIRED: Vercel AI Gateway API Key
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_api_key_here

# OPTIONAL: Gateway Base URL (defaults to Vercel's hosted gateway)
AI_GATEWAY_BASE_URL=https://ai-gateway.vercel.sh/v1

# OPTIONAL: Model Selection (defaults to models below if not set)
AI_GATEWAY_DEFAULT_MODEL=anthropic/claude-sonnet-4.5
AI_GATEWAY_FAST_MODEL=anthropic/claude-haiku-4.5
AI_GATEWAY_INSTANT_MODEL=openai/gpt-5.1-instant
AI_GATEWAY_CODE_MODEL=openai/gpt-5.1-codex
AI_GATEWAY_REASONING_MODEL=openai/gpt-5.1-thinking
```

### Getting Your API Key

1. Sign up at [Vercel](https://vercel.com)
2. Navigate to your project settings
3. Go to the AI Gateway section
4. Generate an API key
5. Add it to your `.env` file as `AI_GATEWAY_API_KEY`

For detailed instructions, see: https://vercel.com/docs/ai-gateway/authentication

---

## Model Selection Strategy

Stepwise uses **5 specific models** for different tasks. Choose the right model for optimal performance and cost:

### 1. Fast Model: `anthropic/claude-haiku-4.5`

**Use for:**
- Quick intent parsing from user input
- Simple yes/no decisions
- Fast validation checks
- Extracting simple information

**Characteristics:**
- Fastest response time
- Lowest cost
- Good for high-volume, simple tasks

**Example Use Cases:**
```javascript
// Intent detection
const intent = await detectUserIntent(userInput, MODEL_MAP.fast);

// Quick validation
const isValid = await validateApiParams(params, MODEL_MAP.fast);
```

### 2. Balanced Model: `anthropic/claude-sonnet-4.5` (Default)

**Use for:**
- General-purpose workflow planning
- API response synthesis
- Most conversational interactions
- Balanced tasks requiring moderate reasoning

**Characteristics:**
- Best balance of speed, cost, and quality
- Default choice when unsure
- Excellent instruction-following

**Example Use Cases:**
```javascript
// Workflow planning
const workflow = await planWorkflow(userRequest, MODEL_MAP.balanced);

// Response generation
const response = await synthesizeResponse(data, MODEL_MAP.balanced);
```

### 3. Instant Model: `openai/gpt-5.1-instant`

**Use for:**
- Real-time conversational responses
- Quick parameter extraction
- Fast OpenAI-style completions

**Characteristics:**
- Ultra-fast OpenAI responses
- Good for real-time interactions
- Stream-friendly

**Example Use Cases:**
```javascript
// Real-time chat
const chatResponse = await chat(message, MODEL_MAP.instant);

// Quick extraction
const params = await extractParams(text, MODEL_MAP.instant);
```

### 4. Code Model: `openai/gpt-5.1-codex`

**Use for:**
- API request generation
- Code snippet generation
- Error message analysis
- Technical documentation generation

**Characteristics:**
- Optimized for code understanding
- Excellent at API construction
- Best for technical tasks

**Example Use Cases:**
```javascript
// Generate API request
const apiRequest = await generateApiRequest(spec, MODEL_MAP.code);

// Analyze error
const errorAnalysis = await analyzeError(stackTrace, MODEL_MAP.code);
```

### 5. Reasoning Model: `openai/gpt-5.1-thinking`

**Use for:**
- Complex multi-step workflow optimization
- Security vulnerability analysis
- Advanced debugging scenarios
- Complex decision-making

**Characteristics:**
- Deepest reasoning capabilities
- Higher latency and cost
- Best for complex problems

**Example Use Cases:**
```javascript
// Complex optimization
const optimizedWorkflow = await optimizeWorkflow(workflow, MODEL_MAP.reasoning);

// Security analysis
const vulns = await analyzeSecurityRisks(api, MODEL_MAP.reasoning);
```

---

## Implementation Patterns

### JavaScript/Node.js Implementation

```javascript
import OpenAI from 'openai';

// Initialize AI Gateway client
const client = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1',
});

// Model selection map
const MODEL_MAP = {
  fast: process.env.AI_GATEWAY_FAST_MODEL || 'anthropic/claude-haiku-4.5',
  balanced: process.env.AI_GATEWAY_DEFAULT_MODEL || 'anthropic/claude-sonnet-4.5',
  instant: process.env.AI_GATEWAY_INSTANT_MODEL || 'openai/gpt-5.1-instant',
  code: process.env.AI_GATEWAY_CODE_MODEL || 'openai/gpt-5.1-codex',
  reasoning: process.env.AI_GATEWAY_REASONING_MODEL || 'openai/gpt-5.1-thinking'
};

// Basic completion
async function generateCompletion(prompt, modelType = 'balanced') {
  const response = await client.chat.completions.create({
    model: MODEL_MAP[modelType],
    messages: [{ role: 'user', content: prompt }],
  });

  return response.choices[0].message.content;
}

// Streaming completion
async function streamCompletion(prompt, modelType = 'balanced') {
  const stream = await client.chat.completions.create({
    model: MODEL_MAP[modelType],
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      process.stdout.write(content);
    }
  }
}

// Structured output
async function generateStructuredOutput(prompt, schema, modelType = 'balanced') {
  const response = await client.chat.completions.create({
    model: MODEL_MAP[modelType],
    messages: [{ role: 'user', content: prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        schema: schema
      }
    }
  });

  return JSON.parse(response.choices[0].message.content);
}

// Tool calling (function calling)
async function callWithTools(prompt, tools, modelType = 'balanced') {
  const response = await client.chat.completions.create({
    model: MODEL_MAP[modelType],
    messages: [{ role: 'user', content: prompt }],
    tools: tools,
    tool_choice: 'auto'
  });

  return response.choices[0].message;
}
```

### Python Implementation

```python
import os
from openai import OpenAI

# Initialize AI Gateway client
client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url=os.getenv('AI_GATEWAY_BASE_URL', 'https://ai-gateway.vercel.sh/v1')
)

# Model selection map
MODEL_MAP = {
    'fast': os.getenv('AI_GATEWAY_FAST_MODEL', 'anthropic/claude-haiku-4.5'),
    'balanced': os.getenv('AI_GATEWAY_DEFAULT_MODEL', 'anthropic/claude-sonnet-4.5'),
    'instant': os.getenv('AI_GATEWAY_INSTANT_MODEL', 'openai/gpt-5.1-instant'),
    'code': os.getenv('AI_GATEWAY_CODE_MODEL', 'openai/gpt-5.1-codex'),
    'reasoning': os.getenv('AI_GATEWAY_REASONING_MODEL', 'openai/gpt-5.1-thinking')
}

# Basic completion
def generate_completion(prompt: str, model_type: str = 'balanced') -> str:
    response = client.chat.completions.create(
        model=MODEL_MAP[model_type],
        messages=[{'role': 'user', 'content': prompt}]
    )

    return response.choices[0].message.content

# Streaming completion
def stream_completion(prompt: str, model_type: str = 'balanced'):
    stream = client.chat.completions.create(
        model=MODEL_MAP[model_type],
        messages=[{'role': 'user', 'content': prompt}],
        stream=True
    )

    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            content = chunk.choices[0].delta.content
            print(content, end='', flush=True)

# Structured output
def generate_structured_output(prompt: str, schema: dict, model_type: str = 'balanced') -> dict:
    response = client.chat.completions.create(
        model=MODEL_MAP[model_type],
        messages=[{'role': 'user', 'content': prompt}],
        response_format={
            'type': 'json_schema',
            'json_schema': {
                'name': 'response',
                'schema': schema
            }
        }
    )

    import json
    return json.loads(response.choices[0].message.content)

# Tool calling
def call_with_tools(prompt: str, tools: list, model_type: str = 'balanced'):
    response = client.chat.completions.create(
        model=MODEL_MAP[model_type],
        messages=[{'role': 'user', 'content': prompt}],
        tools=tools,
        tool_choice='auto'
    )

    return response.choices[0].message
```

---

## Stepwise-Specific Workflows

### Workflow Planning (Balanced Model)

```javascript
async function planWorkflow(userRequest) {
  const prompt = `
You are a workflow planning assistant. Given a user request for API debugging,
create a structured workflow with dependencies.

User Request: ${userRequest}

Return a JSON workflow with:
- steps: array of workflow steps
- dependencies: step IDs that must complete first
- tool: MCP tool to use
- params: parameters for the tool
`;

  const schema = {
    type: 'object',
    properties: {
      steps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tool: { type: 'string' },
            params: { type: 'object' },
            dependencies: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  };

  return await generateStructuredOutput(prompt, schema, 'balanced');
}
```

### Intent Detection (Fast Model)

```javascript
async function detectIntent(userInput) {
  const prompt = `
Classify the user's intent for API debugging.

User Input: ${userInput}

Return JSON with:
- intent: one of [debug_api, test_endpoint, analyze_security, transcribe_audio]
- confidence: 0-1
- extracted_params: any parameters mentioned
`;

  const schema = {
    type: 'object',
    properties: {
      intent: { type: 'string' },
      confidence: { type: 'number' },
      extracted_params: { type: 'object' }
    }
  };

  return await generateStructuredOutput(prompt, schema, 'fast');
}
```

### API Request Generation (Code Model)

```javascript
async function generateApiRequest(apiSpec, userGoal) {
  const prompt = `
Generate a valid API request for the following specification and goal.

API Specification:
${JSON.stringify(apiSpec, null, 2)}

User Goal: ${userGoal}

Return a complete HTTP request including method, headers, body, and parameters.
`;

  return await generateCompletion(prompt, 'code');
}
```

### Security Analysis (Reasoning Model)

```javascript
async function analyzeSecurityRisks(apiEndpoint, requestData) {
  const prompt = `
Perform a comprehensive security analysis of this API interaction.

Endpoint: ${apiEndpoint}
Request Data:
${JSON.stringify(requestData, null, 2)}

Analyze for:
1. Injection vulnerabilities (SQL, XSS, Command)
2. Authentication/Authorization issues
3. Data exposure risks
4. Rate limiting concerns
5. Input validation gaps

Return detailed findings with severity levels.
`;

  return await generateCompletion(prompt, 'reasoning');
}
```

---

## Advanced Features

### Provider Fallbacks

Configure automatic fallbacks if a model is unavailable:

```javascript
const response = await client.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [{ role: 'user', content: prompt }],
  // Fallback to other models if primary fails
  models: [
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-haiku-4.5',
    'openai/gpt-5.1-instant'
  ]
});
```

### Provider Routing

Control which provider to use:

```javascript
const response = await client.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [{ role: 'user', content: prompt }],
  providerOptions: {
    gateway: {
      order: ['vertex', 'anthropic']  // Try Vertex AI first, then Anthropic
    }
  }
});
```

### Cost Tracking

Access cost information from responses:

```javascript
const response = await client.chat.completions.create({
  model: MODEL_MAP.balanced,
  messages: [{ role: 'user', content: prompt }]
});

console.log('Cost:', response.providerMetadata?.gateway?.cost);
console.log('Provider:', response.providerMetadata?.gateway?.routing?.provider);
```

---

## Migration from Direct OpenAI/Anthropic

If you have existing code using direct OpenAI or Anthropic SDKs:

### Before (Direct OpenAI):

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
});
```

### After (AI Gateway):

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1'
});

const response = await openai.chat.completions.create({
  model: 'openai/gpt-5.1-instant',  // Note: model name format changes
  messages: [{ role: 'user', content: 'Hello' }]
});
```

**Changes required:**
1. Change API key environment variable
2. Add `baseURL` pointing to AI Gateway
3. Update model names to include provider prefix (e.g., `openai/` or `anthropic/`)

---

## Error Handling

```javascript
async function robustCompletion(prompt, modelType = 'balanced', maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await client.chat.completions.create({
        model: MODEL_MAP[modelType],
        messages: [{ role: 'user', content: prompt }],
      });

      return response.choices[0].message.content;
    } catch (error) {
      if (error.status === 401) {
        throw new Error('AI_GATEWAY_API_KEY is invalid or expired');
      } else if (error.status === 429) {
        // Rate limit - wait and retry
        const waitTime = Math.pow(2, i) * 1000;  // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else if (i === maxRetries - 1) {
        throw error;  // Last attempt failed
      }
    }
  }
}
```

---

## Testing

### Unit Test Example

```javascript
import { jest } from '@jest/globals';

describe('AI Gateway Integration', () => {
  it('should generate workflow with balanced model', async () => {
    const userRequest = 'Test the JSONPlaceholder /users endpoint';
    const workflow = await planWorkflow(userRequest);

    expect(workflow).toHaveProperty('steps');
    expect(workflow.steps).toBeInstanceOf(Array);
    expect(workflow.steps.length).toBeGreaterThan(0);
  });

  it('should detect intent with fast model', async () => {
    const userInput = 'Debug the login API';
    const intent = await detectIntent(userInput);

    expect(intent.intent).toBe('debug_api');
    expect(intent.confidence).toBeGreaterThan(0.5);
  });
});
```

### Mock for Testing

```javascript
// For testing without API calls
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: '{"intent": "debug_api", "confidence": 0.9}'
              }
            }]
          })
        }
      }
    }))
  };
});
```

---

## Troubleshooting

### Common Issues

**Issue: 401 Unauthorized**
- Verify `AI_GATEWAY_API_KEY` is set correctly in `.env`
- Check API key is not expired
- Ensure no extra whitespace in key

**Issue: Model not found**
- Verify model name includes provider prefix: `anthropic/` or `openai/`
- Check model is available in your AI Gateway account
- Run `node scripts/validate-config.js` to test connectivity

**Issue: Rate limiting (429)**
- Implement exponential backoff (see Error Handling section)
- Consider using faster/cheaper models for high-volume tasks
- Check usage quotas in Vercel dashboard

**Issue: Slow responses**
- Use `stream: true` for better perceived performance
- Choose faster models (`fast` or `instant`) when appropriate
- Consider caching frequent queries

---

## Best Practices

1. **Model Selection**: Always use the cheapest/fastest model that meets your needs
2. **Streaming**: Use streaming for user-facing interactions (better UX)
3. **Structured Output**: Always use `json_schema` for parsed responses
4. **Error Handling**: Implement retries with exponential backoff
5. **Monitoring**: Log costs and track usage by model type
6. **Testing**: Mock AI Gateway in unit tests, use real calls in integration tests
7. **Security**: Never log full prompts/responses that contain sensitive data
8. **Caching**: Cache frequent identical queries to reduce costs

---

## Additional Resources

- [Vercel AI Gateway Documentation](https://vercel.com/docs/ai-gateway)
- [OpenAI-Compatible API Reference](https://vercel.com/docs/ai-gateway/openai-compatible-api)
- [Provider Options Documentation](https://vercel.com/docs/ai-gateway/provider-options)
- [Full OpenAI SDK Documentation](https://github.com/openai/openai-node)
- [Stepwise WORKFLOW_ORCHESTRATION.md](./WORKFLOW_ORCHESTRATION.md)

---

## Summary

Vercel AI Gateway provides Stepwise with:
- ✅ Unified access to 5 specialized models
- ✅ OpenAI-compatible drop-in replacement
- ✅ Built-in observability and cost tracking
- ✅ Automatic failover and reliability
- ✅ Simplified API key management

By following this guide, you can effectively leverage AI Gateway to build robust, cost-effective AI-powered workflows in Stepwise.
