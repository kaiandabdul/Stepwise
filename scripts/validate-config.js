#!/usr/bin/env node

/**
 * Validation Script for Stepwise Configuration
 *
 * Checks all required environment variables and validates API connectivity.
 * Usage: node scripts/validate-config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found');
  console.error(`Expected at: ${envPath}`);
  console.error('Run: cp .env.example .env');
  process.exit(1);
}

dotenv.config({ path: envPath });

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(type, message) {
  const timestamp = new Date().toISOString().substring(11, 19);
  switch (type) {
    case 'info':
      console.log(`[${timestamp}] ${colors.blue}ℹ${colors.reset} ${message}`);
      break;
    case 'success':
      console.log(`[${timestamp}] ${colors.green}✓${colors.reset} ${message}`);
      break;
    case 'error':
      console.log(`[${timestamp}] ${colors.red}✗${colors.reset} ${message}`);
      break;
    case 'warn':
      console.log(`[${timestamp}] ${colors.yellow}⚠${colors.reset} ${message}`);
      break;
  }
}

// Required environment variables
const REQUIRED_VARS = [
  'E2B_API_KEY',
  'GLADIA_API_KEY',
  'HONEYHIVE_API_KEY',
  'HONEYHIVE_PROJECT',
  'AI_GATEWAY_API_KEY'
];

const OPTIONAL_VARS = [
  'E2B_TEMPLATE_ID',
  'HORIZON3_API_KEY',
  'AI_GATEWAY_BASE_URL',
  'AI_GATEWAY_DEFAULT_MODEL',
  'AI_GATEWAY_FAST_MODEL',
  'AI_GATEWAY_INSTANT_MODEL',
  'AI_GATEWAY_CODE_MODEL',
  'AI_GATEWAY_REASONING_MODEL',
  'USE_E2B',
  'LOG_LEVEL',
  'PORT'
];

async function validateEnvVars() {
  log('info', 'Validating environment variables...');
  let allPresent = true;

  for (const variable of REQUIRED_VARS) {
    if (process.env[variable]) {
      const value = process.env[variable];
      const masked = value.substring(0, 4) + '*'.repeat(Math.max(0, value.length - 8)) + value.substring(value.length - 4);
      log('success', `${variable} = ${masked}`);
    } else {
      log('error', `${variable} is missing`);
      allPresent = false;
    }
  }

  log('info', 'Optional variables:');
  for (const variable of OPTIONAL_VARS) {
    if (process.env[variable]) {
      log('success', `${variable} is set`);
    } else {
      log('warn', `${variable} is not set (optional)`);
    }
  }

  return allPresent;
}

async function validateE2B() {
  log('info', 'Validating E2B connection...');
  if (!process.env.E2B_API_KEY) {
    log('warn', 'E2B_API_KEY not set, skipping E2B validation');
    return false;
  }

  try {
    const response = await axios.post(
      'https://api.e2b.dev/sandbox',
      { templateID: 'base' },
      {
        headers: {
          'Authorization': `Bearer ${process.env.E2B_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    log('success', 'E2B API connection successful');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      log('error', 'E2B_API_KEY is invalid or expired');
    } else if (error.code === 'ECONNREFUSED') {
      log('error', 'Cannot connect to E2B API (network error)');
    } else {
      log('error', `E2B validation failed: ${error.message}`);
    }
    return false;
  }
}

async function validateGladia() {
  log('info', 'Validating Gladia connection...');
  if (!process.env.GLADIA_API_KEY) {
    log('warn', 'GLADIA_API_KEY not set, skipping validation');
    return false;
  }

  try {
    const response = await axios.post(
      'https://api.gladia.io/v2/health',
      {},
      {
        headers: {
          'Authorization': `Bearer ${process.env.GLADIA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    log('success', 'Gladia API connection successful');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      log('error', 'GLADIA_API_KEY is invalid or expired');
    } else {
      log('error', `Gladia validation failed: ${error.message}`);
    }
    return false;
  }
}

async function validateHoneyHive() {
  log('info', 'Validating HoneyHive connection...');
  if (!process.env.HONEYHIVE_API_KEY) {
    log('warn', 'HONEYHIVE_API_KEY not set, skipping validation');
    return false;
  }

  try {
    const response = await axios.get(
      'https://api.honeyhive.ai/v1/projects',
      {
        headers: {
          'Authorization': `Bearer ${process.env.HONEYHIVE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    log('success', 'HoneyHive API connection successful');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      log('error', 'HONEYHIVE_API_KEY is invalid or expired');
    } else {
      log('error', `HoneyHive validation failed: ${error.message}`);
    }
    return false;
  }
}

async function validateAIGateway() {
  log('info', 'Validating Vercel AI Gateway connection...');
  if (!process.env.AI_GATEWAY_API_KEY) {
    log('error', 'AI_GATEWAY_API_KEY not set');
    return false;
  }

  const baseURL = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';

  try {
    const response = await axios.get(
      `${baseURL}/models`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    log('success', 'AI Gateway API connection successful');

    // Validate that required models are available
    const models = response.data?.data || [];
    const modelIds = models.map(m => m.id);

    const requiredModels = [
      'anthropic/claude-haiku-4.5',
      'anthropic/claude-sonnet-4.5',
      'openai/gpt-5.1-instant',
      'openai/gpt-5.1-codex',
      'openai/gpt-5.1-thinking'
    ];

    const missingModels = requiredModels.filter(m => !modelIds.includes(m));
    if (missingModels.length > 0) {
      log('warn', `Some configured models may not be available: ${missingModels.join(', ')}`);
      log('info', 'This may be expected if using a different AI Gateway configuration');
    } else {
      log('success', 'All 5 configured models are available via AI Gateway');
    }

    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      log('error', 'AI_GATEWAY_API_KEY is invalid or expired');
    } else if (error.code === 'ECONNREFUSED') {
      log('error', 'Cannot connect to AI Gateway (network error)');
    } else {
      log('error', `AI Gateway validation failed: ${error.message}`);
    }
    return false;
  }
}

async function validateHorizon3() {
  log('info', 'Validating Horizon3 connection...');
  if (!process.env.HORIZON3_API_KEY) {
    if (process.env.HORIZON3_USE_MOCK === 'true') {
      log('success', 'Horizon3 mock mode enabled (HORIZON3_USE_MOCK=true)');
      return true;
    }
    log('warn', 'HORIZON3_API_KEY not set (optional, can use mocks)');
    return false;
  }

  try {
    const response = await axios.get(
      'https://api.horizon3.ai/v1/health',
      {
        headers: {
          'Authorization': `Bearer ${process.env.HORIZON3_API_KEY}`
        },
        timeout: 5000
      }
    );
    log('success', 'Horizon3 API connection successful');
    return true;
  } catch (error) {
    if (error.response?.status === 401) {
      log('error', 'HORIZON3_API_KEY is invalid or expired');
    } else {
      log('warn', `Horizon3 validation failed: ${error.message} (this is optional)`);
    }
    return false;
  }
}

async function checkLocalPorts() {
  log('info', 'Checking local port availability...');
  const ports = {
    8000: 'Gladia MCP',
    8001: 'HoneyHive MCP',
    8002: 'Horizon3 MCP',
    8003: 'Custom API MCP',
    3000: 'Agent Server',
    7860: 'Gradio Frontend'
  };

  const portsAvailable = [];
  const portsTaken = [];

  for (const [port, service] of Object.entries(ports)) {
    try {
      const response = await axios.get(`http://localhost:${port}/health`, {
        timeout: 1000
      });
      portsTaken.push(`${service} (port ${port})`);
      log('warn', `${service} is already running on port ${port}`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        portsAvailable.push(port);
      }
    }
  }

  if (portsAvailable.length === Object.keys(ports).length) {
    log('success', 'All ports are available');
    return true;
  } else {
    log('info', `Some services are already running (may be development setup)`);
    return true;
  }
}

async function main() {
  console.log(`\n${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Stepwise Configuration Validator${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}\n`);

  let hasErrors = false;

  // 1. Validate env vars
  const enVarsValid = await validateEnvVars();
  if (!enVarsValid) {
    hasErrors = true;
  }

  console.log();

  // 2. Validate API connections (non-blocking)
  log('info', 'Validating API connections (this may take a moment)...\n');

  const results = await Promise.allSettled([
    validateE2B(),
    validateGladia(),
    validateHoneyHive(),
    validateAIGateway(),
    validateHorizon3(),
    checkLocalPorts()
  ]);

  console.log();

  // Summary
  const passed = results.filter(r => r.value === true).length;
  const failed = results.filter(r => r.value === false).length;

  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Validation Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${failed}`);

  if (hasErrors || failed > 0) {
    console.log(`\n${colors.red}Validation failed!${colors.reset}`);
    console.log('Please fix the errors above and run this script again.\n');
    process.exit(1);
  } else {
    console.log(`\n${colors.green}All validations passed!${colors.reset}`);
    console.log('Your Stepwise environment is ready to go.\n');
    console.log('Next steps:');
    console.log('1. npm run docker:build    # Build Docker images');
    console.log('2. npm run docker:up       # Start local services');
    console.log('3. npm start               # Start the agent\n');
    process.exit(0);
  }
}

main().catch(error => {
  log('error', `Unexpected error: ${error.message}`);
  process.exit(1);
});
