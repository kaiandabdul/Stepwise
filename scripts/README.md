# Stepwise MCP - Helper Scripts

This directory contains utility scripts to help set up and manage the Stepwise MCP project environment.

## Scripts Overview

### 1. validate-apis.py
**Purpose**: Validate that all required API keys are configured

**Usage**:
```bash
python scripts/validate-apis.py
```

**Validates**:
- E2B API key (required)
- Gladia API key (required)
- HoneyHive API key (required)
- OpenAI or Anthropic API key (at least one required)
- Horizon3 API key (optional)

**Exit Codes**:
- `0` - All required API keys are present
- `1` - One or more required keys are missing

**Features**:
- Loads environment from `.env` file
- Checks key presence and basic validity (minimum length)
- Provides helpful error messages with links to API providers
- Color-coded output for easy reading
- Summary report of all configurations

### 2. setup-env.sh
**Purpose**: Initialize the development environment

**Usage**:
```bash
bash scripts/setup-env.sh
# OR (if executable)
scripts/setup-env.sh
```

**Performs**:
1. Creates `.env` file from `.env.example` if not present
2. Verifies required tools are installed:
   - Node.js
   - Python 3
   - Docker
   - Docker Compose
   - npm & pip
   - E2B CLI
3. Creates project directory structure for Phases 2-8
4. Prints next steps and helpful guidance

**Features**:
- Non-destructive (won't overwrite existing `.env`)
- Provides installation links for missing tools
- Creates all required project directories
- Color-coded output with status indicators

### 3. health-check.sh
**Purpose**: Verify that the development environment is ready for development

**Usage**:
```bash
bash scripts/health-check.sh
# OR (if executable)
scripts/health-check.sh
```

**Checks**:
1. Docker is running
2. E2B CLI is installed and authenticated
3. MCP server ports (8000-8003) are available
4. Required commands (node, python3, npm, git)
5. Environment variables configured in `.env`
6. NPM dependencies installed
7. Python dependencies installed

**Features**:
- Platform-aware port checking (macOS/Linux)
- Detailed output about what to do next
- Checks for common issues (Docker not running, port conflicts)
- Provides commands to fix issues

## Quick Start

### First Time Setup

1. **Run environment setup**:
   ```bash
   scripts/setup-env.sh
   ```

2. **Edit configuration**:
   ```bash
   # Copy .env.example to .env and add your API keys
   nano .env
   ```

3. **Validate API keys**:
   ```bash
   python scripts/validate-apis.py
   ```

4. **Check system health**:
   ```bash
   scripts/health-check.sh
   ```

### During Development

- Before starting services, run `scripts/health-check.sh` to verify everything is ready
- Use `scripts/validate-apis.py` if you change API keys
- Check `.env` configuration if services fail to start

## API Key Sources

- **E2B**: https://e2b.dev/docs/getting-started
- **Gladia**: https://www.gladia.io/
- **HoneyHive**: https://www.honeyhive.ai/
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/
- **Horizon3**: https://horizon3.ai/

## Environment Variables Reference

### Required
- `E2B_API_KEY` - E2B sandbox service
- `GLADIA_API_KEY` - Speech-to-text API
- `HONEYHIVE_API_KEY` - Observability platform
- `OPENAI_API_KEY` OR `ANTHROPIC_API_KEY` - LLM provider

### Optional
- `HORIZON3_API_KEY` - Security scanning (set `HORIZON3_USE_MOCK=true` to use mock data)
- `E2B_TEMPLATE_ID` - Set after Phase 3 (E2B template building)
- `USE_E2B` - Set to `false` for local development without sandboxes
- `HONEYHIVE_PROJECT` - HoneyHive project name (default: "stepwise-agent")
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)

## Troubleshooting

### "Python-dotenv not installed"
```bash
pip install python-dotenv
```

### "Docker not running"
- macOS: Open Docker Desktop application
- Linux: `sudo systemctl start docker`

### "E2B CLI not authenticated"
```bash
npm install -g @e2b/cli
e2b auth login
```

### "Port already in use"
Check and kill process using the port:
```bash
# macOS/Linux
lsof -ti:8000 | xargs kill -9
# (replace 8000 with the port number)
```

### "E2B_TEMPLATE_ID not set"
This is normal - it will be created during Phase 3. Update `.env` after building the template:
```bash
cd e2b-template
e2b template build --name stepwise-debugger
# Copy the template ID to .env as E2B_TEMPLATE_ID
```

## Next Steps

After successful validation and health check:

1. Review **CLAUDE.md** for project overview
2. Start Phase 2: See **phases/PHASE_2.md** for MCP server implementation
3. Follow the 8-phase implementation guide in **phases/**

## Support

- **Architecture**: See `CLAUDE.md` and `docs/ARCHITECTURE.md`
- **Phase Guides**: See `phases/PHASE_*.md` files
- **Technical Deep Dives**: See `docs/` directory
