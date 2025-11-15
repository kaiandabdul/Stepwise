# E2B Custom Template: Stepwise Debugger

## Overview

This is a custom E2B template for the Stepwise Live API Debugger Agent. It includes Docker Engine and docker-compose pre-installed, allowing sandboxes to run containerized MCP servers without additional setup.

### Template Features

- **Base Image**: E2B Code Interpreter (pre-configured Python/Node.js environment)
- **Docker Engine**: Full Docker daemon with CLI tools
- **docker-compose**: Standalone binary for multi-container orchestration
- **Exposed Ports**: 8000, 8001, 8002, 8003 (for MCP servers: Gladia, HoneyHive, Horizon3, Custom API)
- **Working Directory**: `/root` (agent can upload files and docker-compose.yml here)

## Build Instructions

### Prerequisites

- E2B CLI installed: `npm install -g @e2b/cli`
- E2B authentication: `e2b auth login`
- ~10-15 minutes build time (pulling Docker dependencies)

### Building the Template

```bash
# Navigate to e2b-template directory
cd e2b-template

# Build and register template with E2B
e2b template build --name stepwise-debugger

# Output will show template ID (looks like: tmpl_xxxxxxxxxxxxx)
# Save this ID to .env as E2B_TEMPLATE_ID
```

### What Happens During Build

1. E2B reads `e2b.Dockerfile`
2. Base layer pulled from `e2b/code-interpreter:latest`
3. Docker Engine packages installed (~3-5 min)
4. docker-compose binary downloaded (~1-2 min)
5. Template registered on E2B servers (~1-2 min)
6. Template ID provided for use in agent

## Usage Example

Once template is built, create a sandbox using it:

```javascript
const { Sandbox } = require("@e2b/sdk");

// Create sandbox from custom template
const sandbox = await Sandbox.create({
  templateId: process.env.E2B_TEMPLATE_ID  // From .env
});

// Docker is now available inside sandbox
const { stdout } = await sandbox.process.run({
  command: "docker --version"
});
console.log(stdout);  // "Docker version 24.x.x, build xxxxxxx"

// docker-compose is also ready
const { stdout: dcVersion } = await sandbox.process.run({
  command: "docker-compose --version"
});
console.log(dcVersion);  // "Docker Compose version v2.23.0"

// Upload docker-compose.yml and start services
await sandbox.uploadFile({
  remoteFilePath: "/root/docker-compose.yml",
  localFilePath: "./docker-compose.prod.yml"
});

await sandbox.process.run({
  command: "docker-compose up -d",
  cwd: "/root"
});

// MCP servers now running on ports 8000-8003
```

## Architecture

### How Sandboxes Use This Template

```
1. Agent creates E2B sandbox
   ↓
2. Sandbox boots with Docker Engine pre-installed
   ↓
3. Agent uploads docker-compose.yml to /root
   ↓
4. Agent runs: docker-compose up -d
   ↓
5. All 4 MCP servers start in containers:
   - Gladia MCP (port 8000)
   - HoneyHive MCP (port 8001)
   - Horizon3 MCP (port 8002)
   - Custom API MCP (port 8003)
   ↓
6. Agent can call tools via HTTP to localhost:<port>
```

## Dockerfile Breakdown

| Component | Purpose | Size |
|-----------|---------|------|
| `e2b/code-interpreter:latest` | Base with Node.js, Python, bash | ~2GB |
| Docker Engine | Container runtime | ~500MB |
| docker-compose | Multi-container orchestration | ~5MB |

**Total Template Size**: ~2.5GB (cached on E2B servers after build)

## Troubleshooting

### Build Fails: "e2b not authenticated"
```bash
# Re-authenticate with E2B
e2b auth login
# Then retry: e2b template build --name stepwise-debugger
```

### Build Fails: "Docker packages not found"
```bash
# E2B base image may have changed, try updating Docker version in Dockerfile:
# Change: docker-compose-plugin \
# To: docker-compose \
# And adjust curl URL if needed
```

### Build Takes Too Long (>20 min)
- This is normal if E2B servers are under load
- Build can be retried without losing progress
- Consider building during off-peak hours

### Sandbox Can't Find Docker After Template Build
- Verify template ID is correct in .env: `E2B_TEMPLATE_ID=tmpl_xxxxxxxxxxxxx`
- Confirm template exists: `e2b template list | grep stepwise-debugger`
- Try creating new sandbox: `e2b sandbox create --template stepwise-debugger`
- Check Docker is running: `docker --version` inside sandbox

### Docker-Compose Fails in Sandbox
- Ensure docker daemon is running: `docker ps` should work
- Check docker-compose.yml syntax: `docker-compose config`
- Verify all services have `network_mode: host` if needed for MCP ports
- Increase sandbox memory if large images are being pulled

## Notes

- **First-Time Build**: Expect 10-15 minutes. E2B caches dependencies.
- **Subsequent Builds**: If only Dockerfile changes, rebuild is ~2-3 minutes
- **Template Cleanup**: Old templates can be removed with `e2b template rm <template-id>`
- **Port Conflicts**: If ports 8000-8003 are already in use on host, docker-compose will fail (expected in sandboxes)
- **Docker-in-Docker**: Sandbox runs with Docker available (not nested containers)

## Next Steps

After building template:

1. Save template ID to `.env`:
   ```bash
   echo "E2B_TEMPLATE_ID=tmpl_xxxxxxxxxxxxx" >> .env
   ```

2. Test in Phase 2 by creating sandbox and checking Docker:
   ```bash
   e2b sandbox create --template stepwise-debugger
   e2b sandbox connect <sandbox-id>
   # Inside: docker --version && docker-compose --version
   ```

3. Proceed to Phase 2: Build MCP servers (will run in this template)

## Related Files

- `e2b.Dockerfile` - Template definition
- `.e2bignore` - Files excluded from template build
- `../agent/src/e2b/SandboxManager.js` - How agent uses this template
- `../phases/PHASE_3.md` - Detailed E2B integration instructions
